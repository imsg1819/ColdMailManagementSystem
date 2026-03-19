import sys
import json
import smtplib
import ssl
import os
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from email.utils import make_msgid


def build_message(sender_email, email_params, resume_path):
    """Build the email message with optional resume attachment."""
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = email_params["to"]
    msg["Subject"] = email_params["subject"]
    # Generate a unique Message-ID for reply tracking
    msg["Message-ID"] = make_msgid(domain=sender_email.split("@")[1])
    msg.attach(MIMEText(email_params["body"], "html"))

    if resume_path and os.path.isfile(resume_path):
        with open(resume_path, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())
        encoders.encode_base64(part)
        filename = os.path.basename(resume_path)
        part.add_header("Content-Disposition", f"attachment; filename={filename}")
        msg.attach(part)
    
    return msg


def try_smtp_send(sender_email, password, msg):
    """Try sending via SMTP (SSL 465 then TLS 587)."""
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE

    errors = []

    # Method 1: STARTTLS on port 587
    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(sender_email, password)
            server.send_message(msg)
            return True, None
    except smtplib.SMTPAuthenticationError:
        return False, "Authentication failed. Use a Gmail App Password, not your regular password."
    except Exception as e:
        errors.append(str(e))

    # Method 2: SSL on port 465
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context, timeout=10) as server:
            server.login(sender_email, password)
            server.send_message(msg)
            return True, None
    except smtplib.SMTPAuthenticationError:
        return False, "Authentication failed. Use a Gmail App Password, not your regular password."
    except Exception as e:
        errors.append(str(e))

    return False, " | ".join(errors)


def send_email():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input data provided."}))
            return

        data = json.loads(input_data)
        
        sender_email = data.get("sender_email")
        app_password = data.get("app_password")
        email_params = data.get("email")
        resume_path = data.get("resume_path")
        simulate = data.get("simulate", False)
        
        if not sender_email or not app_password:
            print(json.dumps({"success": False, "error": "Missing sender_email or app_password."}))
            return
        
        if not email_params:
            print(json.dumps({"success": False, "error": "Missing email parameters."}))
            return

        msg = build_message(sender_email, email_params, resume_path)

        # If simulate mode is on, skip actual sending
        if simulate:
            has_attachment = bool(resume_path and os.path.isfile(resume_path))
            print(json.dumps({
                "success": True,
                "message": f"[SIMULATED] Email to {email_params['to']} (from {sender_email}, attachment: {has_attachment})",
                "simulated": True
            }))
            return

        # Try real SMTP send
        success, error = try_smtp_send(sender_email, app_password, msg)
        
        if success:
            # Return the Message-ID so the caller can save it for reply tracking
            print(json.dumps({"success": True, "message": f"Email sent to {email_params['to']}", "messageId": msg["Message-ID"]}))
        else:
            # If SMTP fails (likely firewall), offer helpful error
            if "forcibly closed" in str(error) or "timed out" in str(error) or "10054" in str(error):
                error = f"SMTP ports blocked by network firewall. {error}. TIP: Enable 'Simulation Mode' in settings to test the full flow, or use a network without SMTP restrictions."
            print(json.dumps({"success": False, "error": error}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    send_email()
