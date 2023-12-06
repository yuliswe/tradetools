# A simple script that prints the path to the current working directory
echo $(realpath "$(dirname $0)")
