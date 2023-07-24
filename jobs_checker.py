from pylint import epylint as lint

from zipfile import ZipFile
import requests
import shutil
import time
import os
import io

import subprocess
import pkg_resources
import sys

import logging

logging.basicConfig(
    filename="jobs_checker.log",
    encoding="utf-8",
    level=logging.INFO,
    format="%(asctime)s [ %(levelname)s ]  : %(message)s",
    datefmt="%d/%m/%Y %H:%M ",
)

logging.info("Starting jobs_checker.py")

TRYCUBIC_KEY = os.environ["TRYCUBIC_KEY"]
ROOT_FOLDER = os.getcwd()
JOB_FOLDER = os.path.join(ROOT_FOLDER, "job_folder")
FAIL_TIME_WAIT = 5

if not os.path.exists(JOB_FOLDER):
    os.mkdir(JOB_FOLDER)


def clear_run_folder():
    for filename in os.listdir(JOB_FOLDER):
        file_path = os.path.join(JOB_FOLDER, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            logging.error("Error during running folder clearing {}".format(e))
    logging.info("Cleared job dir")


def check_job(job_id: int) -> tuple[bool, str]:
    logging.info("Starting job %d check", job_id)

    os.chdir(JOB_FOLDER)

    lint_output = lint.py_run(
        "main.py --disable all --enable E",
        return_std=True,
    )[0].read()

    os.chdir(ROOT_FOLDER)

    logging.info("Finished job %d check with result: %s", job_id, lint_output)

    return "error" not in lint_output, lint_output


def send_server(addr, params):
    params["api_key"] = TRYCUBIC_KEY
    res = None

    while True:
        logging.info("Attempting to set get requests to server...")

        try:
            res = requests.get(
                "https://cube.qwe.me/" + addr, params=params, stream=True
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
        time.sleep(FAIL_TIME_WAIT)

    logging.info("Successfully requests server %s address", addr)

    return res


def install_modules():
    logging.info("Starting installing misiing modules")
    os.chdir(JOB_FOLDER)

    with open("main.py", "r") as f:
        first_line = f.readline().strip()

    if (
        first_line[0] != "#"
    ):  # check if first line is not comment, then no additional modules are required to be installed
        logging.info("No additional modules were find")
        return 0, ""

    required = set([module.strip() for module in first_line[1:].split(",")])
    installed = {pkg.key for pkg in pkg_resources.working_set}

    missing = required - installed
    errors = []

    if list(missing)[:10]:  # Get only first 10 modules
        for module in missing:
            res = subprocess.run(
                [sys.executable, "-m", "pip", "install", module],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
            if res.returncode != 0:
                errors.append(
                    f"Was not able to install: %s, pip returned with: %d, reason: %s"
                    % (
                        module,
                        res.returncode,
                        res.stderr.read() if res.stderr else " No reason",
                    )
                )

    return len(missing) if not errors else -1, "\n".join(errors)


while True:
    logging.info("Trying to get submited jobs")

    res = send_server("get_submit_job", {"api_key": TRYCUBIC_KEY})
    cur_job = int(res.headers["trycubic_job_id"])

    ZipFile(io.BytesIO(res.content)).extractall(JOB_FOLDER)  # Unpack downloaded job

    install_res, install_err = install_modules()

    if install_res < 0:
        logging.warning("Error during modules installation")
        send_server(
            "job_status_change",
            {"new_status": "error", "job_id": cur_job, "error": install_err},
        )
        continue

    logging.info("Successfully installed all required modules")

    job_res, job_err = check_job(cur_job)

    send_server(
        "job_status_change",
        params={
            "job_id": cur_job,
            "new_status": "pending" if job_res else "error",
            "error": job_err,
        },
    )

    logging.info("Finished checking job %d with result: %s", cur_job, job_res)

    time.sleep(20)
