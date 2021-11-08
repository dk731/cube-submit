from zipfile import ZipFile
import requests
import shutil
import time
import os
import io
from random import random

import logging

logging.basicConfig(
    filename="main_runner.log",
    encoding="utf-8",
    level=logging.INFO,
    format="%(asctime)s [ %(levelname)s ]  : %(message)s",
    datefmt="%d/%m/%Y %H:%M ",
)

logging.info("Starting main_runner.py")


CUR_DIR = os.getcwd()
RUN_FOLDER = os.path.join(CUR_DIR, "run_folder")
TRYCUBIC_KEY = os.environ["TRYCUBIC_KEY"]
FAIL_TIME_WAIT = 10

if not os.path.exists(RUN_FOLDER):
    os.mkdir(RUN_FOLDER)


def clear_run_folder():
    for filename in os.listdir(RUN_FOLDER):
        file_path = os.path.join(RUN_FOLDER, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            logging.error("Error during running folder clearing {}".format(e))
    logging.info("Cleared running dir")


# Runs main.py file that was submited by user. Return true if job excecuted successfully, false - if not
def run_files() -> tuple[bool, str]:
    logging.info("Starting job excecution")
    start_time = time.time()

    time.sleep(random() * 20 + 10)

    logging.info("Finished job excecution in %d", time.time() - start_time)
    return True, ""


def send_server(addr, params):
    params["api_key"] = TRYCUBIC_KEY
    res = None

    while True:
        time.sleep(FAIL_TIME_WAIT)
        logging.info("Attempting to set get requests to server...")

        try:
            res = requests.get(
                "http://trycubic.com:3000/" + addr, params=params, stream=True
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

    logging.info("Successfully requests server %s address", addr)

    return res


while True:
    clear_run_folder()

    res = send_server(
        "get_pending_job", {}
    )  # Get hight job in excecution queue from server

    ZipFile(io.BytesIO(res.content)).extractall(RUN_FOLDER)  # Unpack downloaded job

    job_id, job_username, job_note = (
        res.headers["trycubic_job_id"],
        res.headers["trycubic_username"],
        res.headers["trycubic_note"],
    )

    send_server(
        "job_status_change", {"new_status": "running", "job_id": job_id}
    )  # Update current job status to running

    run_res, run_err = run_files()  # Run submited files

    send_server(
        "job_status_change",
        {
            "new_status": "voting" if run_res else "error",
            "job_id": job_id,
            "error": run_err,
        },
    )  # Update status of excecuted job

    logging.info("Finished job %d excecution with result: %s", job_id, run_res)
