"""Check the Composer distribution endpoint, not the cached package HTML page."""

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request


def published_version_matches(payload, package, tag, commit, wireflow):
    # Composer's minified metadata inherits omitted top-level fields.
    current = {}
    for version in payload.get("packages", {}).get(package, []):
        current.update(version)
        if current.get("version", "").lstrip("v") == tag.lstrip("v"):
            return (current.get("source", {}).get("reference") == commit
                    and current.get("require", {}).get("getartisanflow/wireflow") == wireflow)
    return False


def request_sync(package):
    username = os.environ.get("PACKAGIST_USERNAME")
    token = os.environ.get("PACKAGIST_TOKEN")
    if not username or not token:
        print("::warning::Packagist credentials absent. Relying on the existing GitHub webhook. "
              "Set PACKAGIST_USERNAME and PACKAGIST_TOKEN secrets to explicitly request a sync.")
        return
    query = urllib.parse.urlencode({"username": username, "apiToken": token})
    request = urllib.request.Request(
        "https://packagist.org/api/update-package?" + query,
        data=json.dumps({"repository": {"url": "https://packagist.org/packages/" + package}}).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
        if result.get("status") != "success":
            raise RuntimeError("Packagist did not accept the update request")
        print("Packagist accepted the update request.")
    except (urllib.error.URLError, RuntimeError, ValueError):
        # Never print the request URL: it contains the API token.
        print("::warning::Packagist update request failed. Check credentials and maintainer access. "
              "Still checking whether the GitHub webhook publishes the release.")


def main():
    with open("composer.json") as file:
        composer = json.load(file)
    package = composer["name"]
    tag, commit = os.environ["RELEASE_TAG"], os.environ["RELEASE_SHA"]
    wireflow = composer["require"]["getartisanflow/wireflow"]
    request_sync(package)
    url = "https://repo.packagist.org/p2/" + package + ".json"
    for attempt in range(1, 61):
        try:
            with urllib.request.urlopen(url, timeout=10) as response:
                payload = json.load(response)
            if published_version_matches(payload, package, tag, commit, wireflow):
                print(f"Verified {package} {tag} at {commit}, requiring WireFlow {wireflow}.")
                return
        except (urllib.error.URLError, ValueError):
            pass
        print(f"Waiting for public Packagist metadata ({attempt}/60).", flush=True)
        if attempt < 60:
            time.sleep(15)
    raise SystemExit("The GitHub release exists, but Packagist publication could not be verified. "
                     "Check the package update log/webhook and re-run the workflow; "
                     "the existing tag and release will be reused.")


if __name__ == "__main__":
    main()
