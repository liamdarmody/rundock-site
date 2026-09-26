---
name: Directory submission
about: Submit an agent, skill, pack, extension, or resource for the Rundock directory
title: "[Directory] "
labels: directory
assignees: liamdarmody
---

**Name**
The name of your project.

**GitHub URL**
Link to the public repository.

**Type**
Agent / Skill / Pack / Extension / Resource

A repository that ships a Rundock extension (a `rundock.json` with an `extension` block) is an Extension, even if it also carries agents and skills.

**Ref**
Optional. Leave it empty and the listing shows `owner/repo` to paste into Rundock, which installs your newest release tag and offers an update whenever you tag a newer one. Fill it in only to pin an exact tag, release or commit, for example `v1.0.0`. Never a branch name such as `main`. Tag your releases: a repository with no tags installs at the commit it was fetched from and is never offered an update.

**Author**
Your GitHub username.

**Description**
One or two sentences describing what it does.

**Tags**
Up to 3 tags (e.g. personal-os, engineering, product-management).
