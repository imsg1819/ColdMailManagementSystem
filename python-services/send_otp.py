"""
Send OTP verification email via Gmail SMTP.
Reuses the same App Password config that works for cold emails.
"""
import sys
import json
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_EMAIL = "team.scp.solution@gmail.com"
SMTP_PASSWORD = "vooj qdzz alto wwze"


def send_otp():
    try:
        input_data = sys.stdin.read()
        data = json.loads(input_data)

        to_email = data["to_email"]
        otp_code = data["otp_code"]
        user_name = data.get("user_name", "User")

        msg = MIMEMultipart()
        msg["From"] = f"ColdMails <{SMTP_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = f"Your ColdMails Verification Code: {otp_code}"

        html_body = f"""
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: #2563eb; color: white; font-size: 24px; font-weight: bold; line-height: 48px;">C</div>
                <h2 style="color: #111827; margin: 16px 0 4px;">ColdMails</h2>
            </div>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; text-align: center;">
                <p style="color: #374151; font-size: 16px; margin: 0 0 8px;">Hi {user_name},</p>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">Your verification code is:</p>
                <div style="background: #2563eb; color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 16px 32px; border-radius: 12px; display: inline-block;">
                    {otp_code}
                </div>
                <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0;">This code expires in <strong>5 minutes</strong>.</p>
                <p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0;">If you didn't request this, you can ignore this email.</p>
            </div>
        </div>
        """

        msg.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.send_message(msg)

        print(json.dumps({"success": True, "message": f"OTP sent to {to_email}"}))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))


if __name__ == "__main__":
    send_otp()
