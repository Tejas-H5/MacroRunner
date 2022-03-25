## VSCode macro running extension
Ever had those moments in programming where the only fast way to get something done was to copy the source-file into a new directory and then do some processing on it with a scripting language?

This repository aims to provide a super-simple easy to learn and use API for anyone to quickly automate programming tasks that are just painful to do any other way. The extension gives you access to two new commands: 

- New Command
    - This command opens up a new javascript file to the right of whatever you're working on (or if you already have two editors open, it will put it in the other editor). It has some example code that should explain some of the basics, and allow you to write your own macro. There is no autocomplete. That being said, the API is so minimal that I can probably document it all here and you will probably be able to remember it.
- Run Command
    - This command will quite literally copy all of the contents of the current javascript file, and then execute it. The new string that you assign to the file object you got from getFile() will replace either whatever was selected in the other editor, or everything.

coming soon:
- Save Command

