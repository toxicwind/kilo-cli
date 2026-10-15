# kilo-cli — full fork

This is a full fork of [Kilo-Org/kilo-cli](https://github.com/Kilo-Org/kilo-cli) maintained
under the [toxicwind/kilo-cli](https://github.com/toxicwind/kilo-cli) mirror for the
awrawr-pc stack.

## Provenance

- **Pinned upstream SHA**: `6f08110d4`
- **Forked on**: 2026-10-15
- **Licence**: upstream (MIT for kilo-code, see upstream LICENSE)

## Layout

This directory contains the full upstream source tree. The toxicwind mirror is
pushed in lockstep with the pinned SHA — bump via the `ranch/FORKS.md`
bump procedure.

## Local use

```
cd ranch/kilo-cli
git remote -v     # origin = toxicwind/kilo-cli
git fetch upstream && git merge upstream/main
git push origin main
```
