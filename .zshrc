# Make sure your ~/.zshrc file has the following lines:
# if [ -f ./.zshrc ] && [ `pwd` != ~ ]; then
#   source ./.zshrc
# fi
export PS1='%F{004}%~%f$ '
export WS_DIR="$(dirname $0/)"
source "$(dirname $0/)/devenv.bash"
