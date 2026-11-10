"""Select an immutable stable tag; retrying a release reuses the tag at HEAD."""

import re
import subprocess

VERSION_PATTERN = re.compile(r"^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")


def version_number(tag):
    match = VERSION_PATTERN.fullmatch(tag)
    return tuple(map(int, match.groups())) if match else None


def release_bump(messages):
    if re.search(r"^[a-z]+(?:\([^\n)]+\))?!:|^BREAKING[ -]CHANGE:", messages, re.MULTILINE):
        return "major"
    if re.search(r"^feat(?:\([^\n)]+\))?:", messages, re.MULTILINE):
        return "minor"
    return "patch"


def select_tag(tags, tags_at_head, bump="patch"):
    if bump not in ("patch", "minor", "major"):
        raise ValueError("Unsupported version increment")
    versions = {tag: number for tag in tags if (number := version_number(tag)) is not None}
    existing = [tag for tag in tags_at_head if tag in versions]
    if existing:
        return max(existing, key=versions.get)
    if not versions:
        return "v0.1.0"
    major, minor, patch = max(versions.values())
    if bump == "major":
        major, minor, patch = major + 1, 0, 0
    elif bump == "minor":
        minor, patch = minor + 1, 0
    else:
        patch += 1
    return f"v{major}.{minor}.{patch}"


if __name__ == "__main__":
    def git_tags(*args):
        return subprocess.check_output(["git", "tag", *args], text=True).splitlines()

    tags = git_tags()
    stable = [tag for tag in tags if version_number(tag) is not None]
    latest = max(stable, key=version_number) if stable else None
    history = [f"{latest}..HEAD"] if latest else ["HEAD"]
    messages = subprocess.check_output(["git", "log", "--format=%B", *history], text=True)
    print("tag=" + select_tag(tags, git_tags("--points-at", "HEAD"), release_bump(messages)))
