# funcignore-check

Tries to mimick the `.funcignore` functionality in GitHub Action `azure/functions-action` by reading the `.funcignore` file and show the output in console and/or in folder.

## Setup

Install dependencies: `npm i`

Create a `.env` file in the project root:
```text
FULL_PATH_TO_SERVICE="/Users/username/repo"
SHOW_RULES="true"
SHOW_OUTPUT_IN_CONSOLE="false"
SHOW_OUTPUT_IN_FOLDER="true"
```

### FULL_PATH_TO_SERVICE

This must be the full path to the root of the project you want to check

### SHOW_RULES

Will print out in the console the content of the `.funcignore` file

### SHOW_OUTPUT_IN_CONSOLE

When set to `true` it will print out in the console which files would have been ignored. It does also create the log file `%repo-name-from-service-given-in-FULL_PATH_TO_SERVICE%_console_output.json` that contains which files would have been ignored.

### SHOW_OUTPUT_IN_FOLDER

When set to `true` it will:
- Create a folder named `funcignore-output-%repo-name-from-service-given-in-FULL_PATH_TO_SERVICE%`
- Copy the contents from `FULL_PATH_TO_SERVICE` into the created folder
  - Files ignored by the `.funcignore` file will **NOT** be copied over. Not copied files will be saved in the log file `%repo-name-from-service-given-in-FULL_PATH_TO_SERVICE%_folder_output.txt`
- Run `npm ci --omit=dev --ignore-scripts --min-release-age=0`
- Go through every file in the folder and remove it if it matches any rule from the `.funcignore`
  - All files removed will be saved in the file `%repo-name-from-service-given-in-FULL_PATH_TO_SERVICE%_folder_output.txt`

## Run the check

Make sure you have set up the `.env` correctly, then run `npm run start`

## Clear all output from checks

> [!IMPORTANT]
> This command only works on Mac and Linux

To remove all the output folders and log files created by checks, run `npm run clear`
