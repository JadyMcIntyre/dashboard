# Authors

## Original design and development

**J Mc Intyre** designed and built the Renue Wellness Dashboard in **2026**. The attribution displayed in the application is **Designed & built by J Mc Intyre**.

The original contributions include the design of the staff reference workspace and the engineering of its navigation, clinic selection, search, reference views, and communication tools. Later repository history records work on template management, Supabase sign-in and onboarding, and advisor hours.

## Project history

- **6 November 2026** is the earliest date on which the dashboard source is visible in this repository. Commit `75ca878` adds `index.html`. This date records the first appearance in the available Git history. The date development began is unverified.
- **10–12 November 2026** includes recorded updates to the workspace UI, template tools, advisor hours, invitation setup, and clipboard handling.
- The current Git history lists **Jady** as the commit author name. Subsequent contributions can be recorded here when their attribution is verified. Use `git log` and `git shortlog -sne HEAD` to review the recorded history.

The repository [licence](LICENSE) and the separate notices for [Renue brand assets](resources/brand/README.md) provide the existing licensing and attribution context.

## Preserve evidence of authorship

1. **Sign commits and release tags.** Create or select a signing key, register its public key with your Git host, and configure your local Git signing key. For an SSH signing key, configure it in this repository with the commands below. Replace the key path if yours differs. Protect the private key and retain its public key and fingerprint with the release records. [Configure a Git signing key](https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key)
   
   ```sh
   git config gpg.format ssh
   git config user.signingkey ~/.ssh/id_ed25519.pub
   git config commit.gpgsign true
   git commit -S -m "Describe the reviewed change"
   git tag -s v0.1.0 -m "Renue Wellness Dashboard v0.1.0"
   ```
   
   Use the intended release version for the tag. Before distributing the release, verify the signature with `git verify-commit HEAD` and `git verify-tag v0.1.0`. For local SSH verification, set `gpg.ssh.allowedSignersFile` to an independently maintained file of trusted public signing keys. Leave historical commits and tags intact. [Commit signatures](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) · [Tag signatures](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-tags)

2. **Retain an authorised source and design archive.** After the release is reviewed, archive the signed tag with `git archive --format=zip --output=renue-source-v0.1.0.zip v0.1.0`. Separately retain the original design files and permitted brand assets, their permissions or licence records, the signed commit and tag references, and the recorded UTC release date. Keep these in authorised storage with version history and access controls. For independently verifiable timing, retain a trusted timestamp receipt for the archive digest. Keep credentials and patient information outside the archive.

3. **Hash the release artifacts.** From a clean checkout of the signed tag, run `python3 scripts/build.py` and package the actual files being distributed. Save the artifact checksums alongside the release, then verify them against a downloaded copy.

   ```sh
   tar -czf renue-dashboard-v0.1.0.tar.gz -C dist .
   shasum -a 256 renue-dashboard-v0.1.0.tar.gz renue-source-v0.1.0.zip > SHA256SUMS
   shasum -a 256 -c SHA256SUMS
   ```

4. **Keep a release record.** Record the version, signed tag, full commit hash, build provenance JSON, artifact digests, and deployment identifier together. Retain release notes, approved design changes, and CI results in chronological order. Hashes verify artifact bytes against the recorded digest. Git signatures verify the association with a trusted signing key. The build timestamp records when the build ran.
