from pylint import epylint as lint

import mysql.connector
import requests
import time
import os

import logging

logging.basicConfig(
    filename="../jobs_checker.log",
    encoding="utf-8",
    level=logging.INFO,
    format="%(asctime)s [ %(levelname)s ]  : %(message)s",
    datefmt="%d/%m/%Y %H:%M ",
)

logging.info("Starting jobs_checker.py")

TRYCUBIC_KEY = os.environ["TRYCUBIC_KEY"]
JOBS_FOLDER = os.getcwd()
FAIL_TIME_WAIT = 5

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password=os.environ["MYSQL_PSWD"],
    database="try_cubic",
)
cur = db.cursor()

logging.info("Successfully connected to DB")


def check_job(job_id: int) -> tuple[bool, str]:
    logging.info("Starting job %d check", job_id)
    job_folder = os.path.join(JOBS_FOLDER, str(job_id))

    os.chdir(job_folder)

    lint_output = lint.py_run(
        "main.py --disable all --enable E",
        return_std=True,
    )[0].read()

    logging.info(
        "Finished job %d check with result: %s",
        job_id,
    )

    return "error" not in lint_output, lint_output


def send_server(params):
    params["api_key"] = TRYCUBIC_KEY
    res = None

    while True:
        time.sleep(FAIL_TIME_WAIT)
        logging.info("Attempting to set get requests to server...")

        try:
            res = requests.get(
                "http://127.0.0.1:3000/job_status_change",
                params=params,
            )
        except Exception as e:
            logging.error("Requests raised exception: {}".format(e))
            continue

        if res.status_code == 200:
            break

        logging.warning(
            "Server responded with %d status code, respose: %s",
            res.status_code,
            res.text,
        )

    logging.info(
        "Successfully requested server to change job %d status to %s",
        params["job_id"],
        params["new_status"],
    )

    return res


while True:
    logging.info("Starting jobs checkin cycle")
    cur.execute("SELECT jobs.id FROM jobs WHERE jobs.status = 'submited'")

    jobs_count = 0
    for (job_id,) in cur.fetchall():
        jobs_count += 1
        logging.info("Starting check of job %d", job_id)

        send_server(
            params={"job_id": job_id, "new_status": "validating"},
        )

        job_res, job_err = check_job(job_id)

        send_server(
            params={
                "job_id": job_id,
                "new_status": "pending" if job_res else "error",
                "error": job_err,
            },
        )

    logging.info("Finished checking cycle with %d checked jobs", jobs_count)

    db.commit()
    time.sleep(20)