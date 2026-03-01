"""
Microsoft Graph API email sender for corporate Microsoft 365 accounts with MFA.
Uses cached tokens from setup_graph_auth.py — run that first!
Sends emails via HTTPS (port 443) — not blocked by corporate firewalls.
"""
import sys
import json
import os
import base64
import msal
import requests

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
AUTHORITY = "https://login.microsoftonline.com/common"
SCOPES = ["Mail.Send"]
GRAPH_ENDPOINT = "https://graph.microsoft.com/v1.0"
TOKEN_CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".graph_token_cache.json")


def get_access_token(email):
    """Get access token from cache. Returns (token, error)."""
    if not os.path.exists(TOKEN_CACHE_FILE):
        return None, "Not authenticated. Run setup_graph_auth.py first."

    cache = msal.SerializableTokenCache()
    with open(TOKEN_CACHE_FILE, "r") as f:
        cache.deserialize(f.read())

    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
        token_cache=cache,
    )

    accounts = app.get_accounts(username=email)
    if not accounts:
        accounts = app.get_accounts()
    
    if not accounts:
        return None, "No cached account found. Run setup_graph_auth.py first."

    result = app.acquire_token_silent(SCOPES, account=accounts[0])
    
    if result and "access_token" in result:
        # Save refreshed token
        if cache.has_state_changed:
            with open(TOKEN_CACHE_FILE, "w") as f:
                f.write(cache.serialize())
        return result["access_token"], None
    else:
        return None, "Token expired. Run setup_graph_auth.py to re-authenticate."


def send_email_graph():
    """Send email via Microsoft Graph API."""
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input data provided."}))
            return

        data = json.loads(input_data)

        sender_email = data.get("sender_email")
        email_params = data.get("email")
        resume_path = data.get("resume_path")

        if not sender_email or not email_params:
            print(json.dumps({"success": False, "error": "Missing sender_email or email parameters."}))
            return

        # Get cached access token
        token, error = get_access_token(sender_email)
        if not token:
            print(json.dumps({"success": False, "error": error}))
            return

        # Build Graph API payload
        message = {
            "message": {
                "subject": email_params["subject"],
                "body": {
                    "contentType": "HTML",
                    "content": email_params["body"]
                },
                "toRecipients": [
                    {"emailAddress": {"address": email_params["to"]}}
                ]
            },
            "saveToSentItems": "true"
        }

        # Add resume attachment
        if resume_path and os.path.isfile(resume_path):
            with open(resume_path, "rb") as f:
                file_content = base64.b64encode(f.read()).decode("utf-8")
            message["message"]["attachments"] = [{
                "@odata.type": "#microsoft.graph.fileAttachment",
                "name": os.path.basename(resume_path),
                "contentType": "application/pdf",
                "contentBytes": file_content
            }]

        # Send via Graph API (HTTPS, port 443)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        response = requests.post(
            f"{GRAPH_ENDPOINT}/me/sendMail",
            headers=headers,
            json=message,
            timeout=30
        )

        if response.status_code == 202:
            print(json.dumps({"success": True, "message": f"Email sent to {email_params['to']} via Microsoft Graph"}))
        else:
            error_detail = response.json().get("error", {}).get("message", response.text[:200])
            print(json.dumps({"success": False, "error": f"Graph API error ({response.status_code}): {error_detail}"}))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))


if __name__ == "__main__":
    send_email_graph()
