poetry env use python3.10
poetry install
poetry run nodeenv -n lts .nodevenv
npx -y npm@8 install
