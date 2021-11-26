from zipfile import ZipFile
import requests
import shutil
import time
import os
import io
from random import random
import subprocess
from clip_maker import ClipMaker
import threading

import logging

logging.basicConfig(
    filename="main_runner.log",
    encoding="utf-8",
    level=logging.INFO,
    format="%(asctime)s [ %(levelname)s ]  : %(message)s",
    datefmt="%d/%m/%Y %H:%M ",
)

clip_maker = ClipMaker()
logging.info("Starting main_runner.py")
logging.info("Starting idle process")
idle_proc = subprocess.Popen(["python3.10", "idle_anim.py"])

CUR_DIR = os.getcwd()
RUN_FOLDER = os.path.join(CUR_DIR, "run_folder")
TRYCUBIC_KEY = os.environ["TRYCUBIC_KEY"]
FAIL_TIME_WAIT = 10
RUN_SCRIPT = os.path.join(RUN_FOLDER, "main.py")

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
    logging.info("Trying to stop idle process")
    try:
        idle_proc.terminate()
    except:
        pass

    logging.info("Starting job excecution")
    start_time = time.time()

    prog_suc = None

    try:
        proc = subprocess.Popen(["python3.9", RUN_SCRIPT])
        prog_suc = proc.wait(timeout=60.0) == 0  # Check if execution status was 0
    except subprocess.TimeoutExpired:
        proc.terminate()
        prog_suc = (
            True  # Execution was seccussfull because timeout exception was triggered
        )

    logging.info("Finished job excecution in %d", time.time() - start_time)
    return (
        prog_suc,
        proc.stderr.read() if proc.stderr else "",
        max(time.time() - start_time, 60),
    )


def send_server(addr, params):
    params["api_key"] = TRYCUBIC_KEY
    res = None

    while True:
        logging.info("Attempting to set get requests to server...")

        try:
            res = requests.get(
                "https://trycubic.com/" + addr, params=params, stream=True
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


def remove_voting(job_id, res_url):
    time.sleep(120)

    logging.info("Moving job %s to done stage", job_id)
    send_server(
        "job_status_change",
        {"new_status": "done", "job_id": job_id, "video_url": res_url},
    )  # Change status to done after 60 seconds of voting


def publish_clip(notes, length, job_id):
    send_server(
        "job_status_change",
        {
            "new_status": "rendering",
            "job_id": job_id,
            "error": run_err,
        },
    )

    logging.info("Starting video render for %s job with length %d", job_id, length)
    res_url = clip_maker.make_clip(notes, length)

    logging.info("Moving job %s to voting stage", job_id)
    send_server(
        "job_status_change",
        {"new_status": "voting", "job_id": job_id, "video_url": res_url},
    )

    threading.Thread(target=remove_voting, args=[job_id, res_url], daemon=True).start()


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

    run_res, run_err, run_time = run_files()  # Run submited files

    idle_proc = subprocess.Popen(
        ["python3.10", "idle_anim.py"]
    )  # Start idle animation process

    if run_res:
        threading.Thread(
            target=publish_clip, args=[job_note, run_time, job_id], daemon=True
        ).start()

    else:
        send_server(
            "job_status_change",
            {
                "new_status": "error",
                "job_id": job_id,
                "error": run_err,
            },
        )

    logging.info("Finished job %s excecution with result: %s", job_id, run_res)
