"""
SendGrid API email sender — sends over HTTPS (port 443).
Works on any network, including corporate networks that block SMTP.
Uses the SendGrid REST API via the requests library.
"""
import sys
import json
import os
import base64
import requests


SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"


def send_email():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input data provided."}))
            return

        data = json.loads(input_data)

        api_key = data.get("api_key")
        sender_email = data.get("sender_email")
        sender_name = data.get("sender_name", "")
        email_params = data.get("email")
        resume_path = data.get("resume_path")

        if not api_key:
            print(json.dumps({"success": False, "error": "Missing SendGrid API key. Get one free at https://sendgrid.com"}))
            return

        if not sender_email or not email_params:
            print(json.dumps({"success": False, "error": "Missing sender_email or email parameters."}))
            return

        # Build SendGrid API payload
        payload = {
            "personalizations": [
                {
                    "to": [{"email": email_params["to"]}]
                }
            ],
            "from": {
                "email": sender_email,
                "name": sender_name or sender_email
            },
            "subject": email_params["subject"],
            "content": [
                {
                    "type": "text/html",
                    "value": email_params["body"]
                }
            ]
        }

        # Attach resume PDF if available
        if resume_path and os.path.isfile(resume_path):
            with open(resume_path, "rb") as f:
                file_content = base64.b64encode(f.read()).decode("utf-8")
            payload["attachments"] = [
                {
                    "content": file_content,
                    "filename": os.path.basename(resume_path),
                    "type": "application/pdf",
                    "disposition": "attachment"
                }
            ]

        # Send via SendGrid HTTPS API
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        response = requests.post(
            SENDGRID_API_URL,
            headers=headers,
            json=payload,
            timeout=30
        )

        if response.status_code in (200, 202):
            print(json.dumps({"success": True, "message": f"Email sent to {email_params['to']} via SendGrid"}))
        else:
            try:
                error_body = response.json()
                errors = error_body.get("errors", [])
                error_msg = errors[0]["message"] if errors else response.text[:200]
            except Exception:
                error_msg = response.text[:200]
            print(json.dumps({"success": False, "error": f"SendGrid error ({response.status_code}): {error_msg}"}))

    except requests.exceptions.ConnectionError:
        print(json.dumps({"success": False, "error": "Cannot reach SendGrid API. Check your internet connection."}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))


if __name__ == "__main__":
    send_email()
