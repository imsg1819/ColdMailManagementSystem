"""
detect_timezone.py - Detects timezone from location/company data.

Usage:
  1. Piped JSON input: echo '{"location":"San Francisco","company":"Google"}' | python detect_timezone.py
  2. Returns: {"success":true, "timezone":"America/Los_Angeles", "estimated":false, "method":"location_match"}

Detection chain:
  1. Location string → look up in known city/region → timezone mapping
  2. Company name → look up in known HQ database
  3. Email domain TLD → country-level timezone guess
  4. Fallback → America/New_York (flagged as estimated)
"""

import sys
import json
import re

# ---- Comprehensive city/region → timezone mapping ----
LOCATION_TO_TIMEZONE = {
    # United States - Major Cities
    "new york": "America/New_York", "nyc": "America/New_York",
    "manhattan": "America/New_York", "brooklyn": "America/New_York",
    "boston": "America/New_York", "philadelphia": "America/New_York",
    "washington": "America/New_York", "dc": "America/New_York",
    "atlanta": "America/New_York", "miami": "America/New_York",
    "charlotte": "America/New_York", "raleigh": "America/New_York",
    "pittsburgh": "America/New_York", "detroit": "America/New_York",
    "cleveland": "America/New_York", "orlando": "America/New_York",
    "tampa": "America/New_York", "jacksonville": "America/New_York",
    "baltimore": "America/New_York", "richmond": "America/New_York",

    "chicago": "America/Chicago", "houston": "America/Chicago",
    "dallas": "America/Chicago", "austin": "America/Chicago",
    "san antonio": "America/Chicago", "nashville": "America/Chicago",
    "memphis": "America/Chicago", "milwaukee": "America/Chicago",
    "minneapolis": "America/Chicago", "st louis": "America/Chicago",
    "kansas city": "America/Chicago", "new orleans": "America/Chicago",
    "indianapolis": "America/Indiana/Indianapolis",
    "oklahoma city": "America/Chicago", "omaha": "America/Chicago",

    "denver": "America/Denver", "phoenix": "America/Phoenix",
    "salt lake city": "America/Denver", "albuquerque": "America/Denver",
    "tucson": "America/Phoenix", "boise": "America/Boise",
    "el paso": "America/Denver", "colorado springs": "America/Denver",

    "los angeles": "America/Los_Angeles", "la": "America/Los_Angeles",
    "san francisco": "America/Los_Angeles", "sf": "America/Los_Angeles",
    "san jose": "America/Los_Angeles", "seattle": "America/Los_Angeles",
    "portland": "America/Los_Angeles", "san diego": "America/Los_Angeles",
    "sacramento": "America/Los_Angeles", "las vegas": "America/Los_Angeles",
    "silicon valley": "America/Los_Angeles", "bay area": "America/Los_Angeles",
    "palo alto": "America/Los_Angeles", "mountain view": "America/Los_Angeles",
    "cupertino": "America/Los_Angeles", "menlo park": "America/Los_Angeles",
    "sunnyvale": "America/Los_Angeles", "redmond": "America/Los_Angeles",
    "bellevue": "America/Los_Angeles", "irvine": "America/Los_Angeles",

    "honolulu": "Pacific/Honolulu", "hawaii": "Pacific/Honolulu",
    "anchorage": "America/Anchorage", "alaska": "America/Anchorage",

    # US States
    "california": "America/Los_Angeles", "ca": "America/Los_Angeles",
    "texas": "America/Chicago", "tx": "America/Chicago",
    "florida": "America/New_York", "fl": "America/New_York",
    "new jersey": "America/New_York", "nj": "America/New_York",
    "georgia": "America/New_York", "ga": "America/New_York",
    "illinois": "America/Chicago", "il": "America/Chicago",
    "pennsylvania": "America/New_York", "pa": "America/New_York",
    "ohio": "America/New_York", "massachusetts": "America/New_York",
    "virginia": "America/New_York", "north carolina": "America/New_York",
    "michigan": "America/New_York", "washington state": "America/Los_Angeles",
    "oregon": "America/Los_Angeles", "colorado": "America/Denver",
    "arizona": "America/Phoenix", "minnesota": "America/Chicago",
    "wisconsin": "America/Chicago", "maryland": "America/New_York",
    "connecticut": "America/New_York", "utah": "America/Denver",
    "nevada": "America/Los_Angeles",

    # Canada
    "toronto": "America/Toronto", "vancouver": "America/Vancouver",
    "montreal": "America/Toronto", "calgary": "America/Edmonton",
    "ottawa": "America/Toronto", "edmonton": "America/Edmonton",
    "winnipeg": "America/Winnipeg",

    # United Kingdom
    "london": "Europe/London", "manchester": "Europe/London",
    "birmingham": "Europe/London", "edinburgh": "Europe/London",
    "glasgow": "Europe/London", "bristol": "Europe/London",
    "cambridge": "Europe/London", "oxford": "Europe/London",
    "uk": "Europe/London", "united kingdom": "Europe/London",
    "england": "Europe/London", "scotland": "Europe/London",

    # Europe
    "berlin": "Europe/Berlin", "munich": "Europe/Berlin",
    "frankfurt": "Europe/Berlin", "hamburg": "Europe/Berlin",
    "germany": "Europe/Berlin",
    "paris": "Europe/Paris", "lyon": "Europe/Paris", "france": "Europe/Paris",
    "amsterdam": "Europe/Amsterdam", "netherlands": "Europe/Amsterdam",
    "dublin": "Europe/Dublin", "ireland": "Europe/Dublin",
    "zurich": "Europe/Zurich", "geneva": "Europe/Zurich", "switzerland": "Europe/Zurich",
    "stockholm": "Europe/Stockholm", "sweden": "Europe/Stockholm",
    "oslo": "Europe/Oslo", "norway": "Europe/Oslo",
    "copenhagen": "Europe/Copenhagen", "denmark": "Europe/Copenhagen",
    "helsinki": "Europe/Helsinki", "finland": "Europe/Helsinki",
    "madrid": "Europe/Madrid", "barcelona": "Europe/Madrid", "spain": "Europe/Madrid",
    "rome": "Europe/Rome", "milan": "Europe/Rome", "italy": "Europe/Rome",
    "lisbon": "Europe/Lisbon", "portugal": "Europe/Lisbon",
    "vienna": "Europe/Vienna", "austria": "Europe/Vienna",
    "brussels": "Europe/Brussels", "belgium": "Europe/Brussels",
    "prague": "Europe/Prague", "warsaw": "Europe/Warsaw",
    "budapest": "Europe/Budapest",

    # India
    "mumbai": "Asia/Kolkata", "delhi": "Asia/Kolkata",
    "bangalore": "Asia/Kolkata", "bengaluru": "Asia/Kolkata",
    "hyderabad": "Asia/Kolkata", "chennai": "Asia/Kolkata",
    "pune": "Asia/Kolkata", "kolkata": "Asia/Kolkata",
    "ahmedabad": "Asia/Kolkata", "jaipur": "Asia/Kolkata",
    "noida": "Asia/Kolkata", "gurgaon": "Asia/Kolkata",
    "gurugram": "Asia/Kolkata", "india": "Asia/Kolkata",

    # Asia-Pacific
    "tokyo": "Asia/Tokyo", "osaka": "Asia/Tokyo", "japan": "Asia/Tokyo",
    "seoul": "Asia/Seoul", "south korea": "Asia/Seoul",
    "beijing": "Asia/Shanghai", "shanghai": "Asia/Shanghai",
    "shenzhen": "Asia/Shanghai", "guangzhou": "Asia/Shanghai",
    "china": "Asia/Shanghai",
    "hong kong": "Asia/Hong_Kong",
    "singapore": "Asia/Singapore",
    "taipei": "Asia/Taipei", "taiwan": "Asia/Taipei",
    "sydney": "Australia/Sydney", "melbourne": "Australia/Melbourne",
    "brisbane": "Australia/Brisbane", "perth": "Australia/Perth",
    "australia": "Australia/Sydney",
    "auckland": "Pacific/Auckland", "wellington": "Pacific/Auckland",
    "new zealand": "Pacific/Auckland",
    "dubai": "Asia/Dubai", "abu dhabi": "Asia/Dubai", "uae": "Asia/Dubai",
    "tel aviv": "Asia/Jerusalem", "israel": "Asia/Jerusalem",
    "bangkok": "Asia/Bangkok", "thailand": "Asia/Bangkok",
    "jakarta": "Asia/Jakarta", "indonesia": "Asia/Jakarta",
    "kuala lumpur": "Asia/Kuala_Lumpur", "malaysia": "Asia/Kuala_Lumpur",

    # South America
    "sao paulo": "America/Sao_Paulo", "rio de janeiro": "America/Sao_Paulo",
    "brazil": "America/Sao_Paulo",
    "buenos aires": "America/Argentina/Buenos_Aires", "argentina": "America/Argentina/Buenos_Aires",
    "bogota": "America/Bogota", "colombia": "America/Bogota",
    "santiago": "America/Santiago", "chile": "America/Santiago",
    "lima": "America/Lima", "peru": "America/Lima",
    "mexico city": "America/Mexico_City", "mexico": "America/Mexico_City",
}

# ---- Well-known company → HQ timezone mapping ----
COMPANY_HQ_TIMEZONE = {
    "google": "America/Los_Angeles", "alphabet": "America/Los_Angeles",
    "apple": "America/Los_Angeles",
    "meta": "America/Los_Angeles", "facebook": "America/Los_Angeles",
    "amazon": "America/Los_Angeles",
    "microsoft": "America/Los_Angeles",
    "netflix": "America/Los_Angeles",
    "tesla": "America/Chicago",
    "nvidia": "America/Los_Angeles",
    "salesforce": "America/Los_Angeles",
    "uber": "America/Los_Angeles",
    "airbnb": "America/Los_Angeles",
    "linkedin": "America/Los_Angeles",
    "twitter": "America/Los_Angeles", "x corp": "America/Los_Angeles",
    "snap": "America/Los_Angeles", "snapchat": "America/Los_Angeles",
    "stripe": "America/Los_Angeles",
    "slack": "America/Los_Angeles",
    "zoom": "America/Los_Angeles",
    "dropbox": "America/Los_Angeles",
    "square": "America/Los_Angeles", "block": "America/Los_Angeles",
    "palantir": "America/Denver",
    "oracle": "America/Chicago",
    "ibm": "America/New_York",
    "intel": "America/Los_Angeles",
    "amd": "America/Los_Angeles",
    "qualcomm": "America/Los_Angeles",
    "cisco": "America/Los_Angeles",
    "vmware": "America/Los_Angeles",
    "adobe": "America/Los_Angeles",
    "intuit": "America/Los_Angeles",
    "paypal": "America/Los_Angeles",
    "spotify": "Europe/Stockholm",
    "shopify": "America/Toronto",
    "atlassian": "Australia/Sydney",
    "canva": "Australia/Sydney",
    "samsung": "Asia/Seoul",
    "sony": "Asia/Tokyo",
    "tiktok": "America/Los_Angeles", "bytedance": "Asia/Shanghai",
    "tata": "Asia/Kolkata", "tcs": "Asia/Kolkata",
    "infosys": "Asia/Kolkata", "wipro": "Asia/Kolkata",
    "hcl": "Asia/Kolkata", "reliance": "Asia/Kolkata",
    "flipkart": "Asia/Kolkata", "swiggy": "Asia/Kolkata",
    "zomato": "Asia/Kolkata", "razorpay": "Asia/Kolkata",
    "ola": "Asia/Kolkata", "paytm": "Asia/Kolkata",
    "zerodha": "Asia/Kolkata", "freshworks": "Asia/Kolkata",
    "jpmorgan": "America/New_York", "jp morgan": "America/New_York",
    "goldman sachs": "America/New_York",
    "morgan stanley": "America/New_York",
    "bank of america": "America/New_York",
    "citigroup": "America/New_York", "citi": "America/New_York",
    "wells fargo": "America/Los_Angeles",
    "deloitte": "America/New_York",
    "pwc": "Europe/London", "pricewaterhousecoopers": "Europe/London",
    "kpmg": "Europe/Amsterdam",
    "ey": "Europe/London", "ernst & young": "Europe/London",
    "mckinsey": "America/New_York",
    "bcg": "America/New_York", "boston consulting": "America/New_York",
    "bain": "America/New_York",
    "accenture": "Europe/Dublin",
    "sap": "Europe/Berlin",
    "siemens": "Europe/Berlin",
    "bmw": "Europe/Berlin",
    "hsbc": "Europe/London",
    "barclays": "Europe/London",
}

# ---- Email TLD → timezone ----
EMAIL_TLD_TIMEZONE = {
    ".in": "Asia/Kolkata",
    ".uk": "Europe/London",
    ".co.uk": "Europe/London",
    ".de": "Europe/Berlin",
    ".fr": "Europe/Paris",
    ".jp": "Asia/Tokyo",
    ".au": "Australia/Sydney",
    ".ca": "America/Toronto",
    ".br": "America/Sao_Paulo",
    ".sg": "Asia/Singapore",
    ".ae": "Asia/Dubai",
    ".il": "Asia/Jerusalem",
    ".kr": "Asia/Seoul",
    ".cn": "Asia/Shanghai",
    ".nl": "Europe/Amsterdam",
    ".se": "Europe/Stockholm",
    ".no": "Europe/Oslo",
    ".ch": "Europe/Zurich",
    ".ie": "Europe/Dublin",
    ".es": "Europe/Madrid",
    ".it": "Europe/Rome",
    ".pt": "Europe/Lisbon",
    ".mx": "America/Mexico_City",
    ".nz": "Pacific/Auckland",
}

def normalize(s):
    """Normalize a string for matching: lowercase, strip, remove punctuation."""
    return re.sub(r'[^\w\s]', '', s.lower().strip())

def detect_from_location(location):
    """Try to match location string to a known timezone."""
    if not location:
        return None
    loc = normalize(location)
    
    # Direct match
    if loc in LOCATION_TO_TIMEZONE:
        return LOCATION_TO_TIMEZONE[loc]
    
    # Try matching any known city/region within the location string
    # Sort by length descending so "san francisco" matches before "san"
    for key in sorted(LOCATION_TO_TIMEZONE.keys(), key=len, reverse=True):
        if key in loc:
            return LOCATION_TO_TIMEZONE[key]
    
    return None

def detect_from_company(company):
    """Try to match company name to a known HQ timezone."""
    if not company:
        return None
    comp = normalize(company)
    
    # Direct match
    if comp in COMPANY_HQ_TIMEZONE:
        return COMPANY_HQ_TIMEZONE[comp]
    
    # Partial match: check if any known company name is in the company string
    for key in sorted(COMPANY_HQ_TIMEZONE.keys(), key=len, reverse=True):
        if key in comp:
            return COMPANY_HQ_TIMEZONE[key]
    
    return None

def detect_from_email(email):
    """Try to guess timezone from email domain TLD."""
    if not email:
        return None
    email = email.lower().strip()
    domain = email.split("@")[-1] if "@" in email else ""
    
    # Check compound TLDs first (e.g., .co.uk)
    for tld in sorted(EMAIL_TLD_TIMEZONE.keys(), key=len, reverse=True):
        if domain.endswith(tld):
            return EMAIL_TLD_TIMEZONE[tld]
    
    return None

def detect_timezone(location=None, company=None, email=None):
    """
    Detect timezone using a chain of methods:
    1. Location → known city/region mapping
    2. Company → known HQ mapping
    3. Email TLD → country-level guess
    4. Fallback → America/New_York (estimated)
    """
    # Method 1: Location
    tz = detect_from_location(location)
    if tz:
        return {"timezone": tz, "estimated": False, "method": "location_match"}
    
    # Method 2: Company HQ
    tz = detect_from_company(company)
    if tz:
        return {"timezone": tz, "estimated": False, "method": "company_hq"}
    
    # Method 3: Email TLD
    tz = detect_from_email(email)
    if tz:
        return {"timezone": tz, "estimated": True, "method": "email_tld"}
    
    # Method 4: Fallback
    return {"timezone": "America/New_York", "estimated": True, "method": "default_fallback"}

if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    result = detect_timezone(
        location=data.get("location"),
        company=data.get("company"),
        email=data.get("email")
    )
    print(json.dumps({"success": True, **result}))
