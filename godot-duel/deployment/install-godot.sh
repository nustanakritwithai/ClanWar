#!/usr/bin/env bash
# Official Godot release only; checksums are pinned from release asset metadata.
# Does not use sudo, a PAT, a paid service, or a third-party Godot setup action.
set -euo pipefail

version='4.6.3'
release="${version}-stable"
editor="Godot_v${release}_linux.x86_64.zip"
templates="Godot_v${release}_export_templates.tpz"
base="https://github.com/godotengine/godot-builds/releases/download/${release}"
editor_sha256='d0bc2113065e481c9c2c2b2c37daa4e8be3fe9e27f0ab9ab0b6096e9a37907f3'
templates_sha256='3fbe2c0e2dec9d537ab9ec97bcf8da91dcf23357fc51f67092dd068d839290a8'

: "${RUNNER_TEMP:?Run on a Linux GitHub-hosted Actions runner, or set RUNNER_TEMP explicitly}"
: "${GITHUB_PATH:?Set GITHUB_PATH to a writable file for a local installation}"
install_dir="${RUNNER_TEMP}/clanwar-godot-${version}"
template_dir="${XDG_DATA_HOME:-${HOME}/.local/share}/godot/export_templates/${version}.stable"
mkdir -p "${install_dir}/downloads" "${install_dir}/bin" "${template_dir}"

download() {
  curl --fail --location --retry 5 --retry-delay 3 --connect-timeout 30 \
    --max-time 900 --proto '=https' --proto-redir '=https' \
    --output "${install_dir}/downloads/$1" "${base}/$1"
}

download "${editor}"
download "${templates}"
(
  cd "${install_dir}/downloads"
  printf '%s  %s\n%s  %s\n' \
    "${editor_sha256}" "${editor}" "${templates_sha256}" "${templates}" \
    | sha256sum --check --strict -
)

# Extract only fixed, expected archive members, and only after both checks pass.
unzip -p "${install_dir}/downloads/${editor}" "Godot_v${release}_linux.x86_64" \
  > "${install_dir}/bin/godot"
chmod 0755 "${install_dir}/bin/godot"
for file in web_nothreads_release.zip web_nothreads_debug.zip; do
  unzip -p "${install_dir}/downloads/${templates}" "templates/${file}" \
    > "${template_dir}/${file}"
  unzip -tq "${template_dir}/${file}"
done
actual_version="$("${install_dir}/bin/godot" --headless --version)"
case "${actual_version}" in
  4.6.3.stable.official.*) ;;
  *) printf 'Unexpected Godot version: %s\n' "${actual_version}" >&2; exit 1 ;;
esac
printf '%s\n' "${install_dir}/bin" >> "${GITHUB_PATH}"
printf 'Installed %s and matching official single-thread Web templates\n' "${actual_version}"
