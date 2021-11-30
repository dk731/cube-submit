from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.action_chains import ActionChains

from twitchAPI.twitch import Twitch
from twitchAPI.oauth import UserAuthenticator
from twitchAPI.types import AuthScope

from getpass import getpass
import os
import time

import logging


class ClipMaker:
    def __init__(self):
        logging.info("Creating ClipMaker Object")

        logging.info("Acquiring Twitch API object")
        self.twitch_scopes = [
            AuthScope.CLIPS_EDIT,
            AuthScope.BITS_READ,
            AuthScope.CHANNEL_READ_STREAM_KEY,
        ]
        self.twitch = Twitch(
            os.environ["TWITCH_CLIENT_ID"],
            os.environ["TWITCH_SECRET"],
            target_app_auth_scope=self.twitch_scopes,
            authenticate_app=True,
        )

        logging.info("Starting twitch user OAuth")
        auth = UserAuthenticator(self.twitch, self.twitch_scopes, force_verify=False)
        token, refresh_token = auth.authenticate()
        self.twitch.set_user_authentication(token, self.twitch_scopes, refresh_token)

        # self.cur_user = self.twitch.get_users(logins=[input("Please enter Twitch Login Name: ")])
        self.twitch_user = self.twitch.get_users(logins=["OOKEEEEEE"])["data"][0]

        logging.info("Creating Chrome Selenium Driver")
        self.driver = webdriver.Chrome()
        self.sel_wait = wait = WebDriverWait(self.driver, 60)
        self._login_twitch()

        self.created_clips = []

    def _login_twitch(self):
        logging.info("Attepting to login into twitch.tv using selenium dirver")
        self.driver.get("https://www.twitch.tv/")
        self.driver.find_element(
            By.XPATH, "//button[@data-a-target='login-button']"
        ).click()
        login_input = self.sel_wait.until(
            EC.element_to_be_clickable((By.XPATH, "//input[@id='login-username']"))
        )
        password_input = self.sel_wait.until(
            EC.element_to_be_clickable((By.XPATH, "//input[@id='password-input']"))
        )
        login_input.send_keys(os.environ["TWITCH_LOGIN"])
        password_input.send_keys(os.environ["TWITCH_PSWD"])
        self.driver.find_element(
            By.XPATH, "//button[@data-a-target='passport-login-button']"
        ).click()
        while True:
            code_field = self.sel_wait.until(
                EC.element_to_be_clickable(
                    (
                        By.XPATH,
                        "//input[@data-a-target='tw-input' and @autocomplete='one-time-code']",
                    )
                )
            )

            code_field.send_keys(Keys.CONTROL + "a")
            code_field.send_keys(Keys.DELETE)

            code_field.send_keys(getpass("Please enter Auth Number: "))
            submit_btn = self.driver.find_element(
                By.XPATH, "//button[@target='submit_button']"
            )
            if not submit_btn.is_enabled():
                logging.warning("Inncorrent Auth code, please try again")
                continue
            submit_btn.click()
            time.sleep(5)
            try:
                if submit_btn.is_displayed():
                    logging.warning("Inncorrent Auth code, please try again")
                    continue
            except:
                break
        logging.info("Successfully logginned into twitch")

    def make_clip(self, clip_name, clip_time):
        logging.info(
            "Creating clip with name '%s' with length %d", clip_name, clip_time
        )
        clip = self.twitch.create_clip(self.twitch_user["id"], has_delay=True)["data"][
            0
        ]

        logging.info("Starting publishing process of '%s' clip", clip_name)
        self.driver.get(clip["edit_url"])

        sel_time = self.sel_wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//div[@data-test-selector='overlay']")
            )
        )
        left_border = self.sel_wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "(//div[@data-test-selector='section']//figure)[1]")
            )
        )

        cur_length_el = self.driver.find_element(
            By.XPATH,
            "//div[@data-test-selector='section']/div/div/div/div/div/p/strong",
        )
        cur_length = float(cur_length_el.get_attribute("textContent")[:-1])

        offset_length = (sel_time.size["width"] / cur_length) * (cur_length - clip_time)

        ActionChains(self.driver).drag_and_drop_by_offset(
            left_border, offset_length, 0
        ).perform()
        self.driver.find_element(By.XPATH, "//input[@id='cmgr-title-input']").send_keys(
            clip_name
        )

        self._accept_cookies()

        self.sel_wait.until(
            EC.element_to_be_clickable((By.XPATH, "//div[text()='Publish']"))
        ).click()

        self.sel_wait.until(
            EC.presence_of_element_located(
                (By.XPATH, "//button[@data-test-selector='social-share-button']")
            )
        ).click()

        out_url = self.sel_wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//button[@data-test-selector='social-share-button']/parent::div/following-sibling::div[1]//input",
                )
            )
        )

        logging.info("Successfully published '%s' clip", clip_name)

        self.created_clips.append(clip)

        return out_url.get_attribute("value")

    def _accept_cookies(self):
        try:
            self.driver.find_element(
                By.XPATH, "//button[@data-a-target='consent-banner-accept']"
            ).click()
        except:
            pass


if __name__ == "__main__":
    c = ClipMaker()
    input("Press enter to creat clip")
    res = c.make_clip("Test clip", 15)
    print("Created clip with: ", res)
    pass
