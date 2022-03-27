// just a heuristic, wont work in all cases since we aren't doing any parsing
// also doesn't detect for(;;). people who use for(;;) are truly deranged and don't need saving
export const containsWhileLoop = (src: string) => {
    // delete all strings (cheers https://stackoverflow.com/questions/49906179/regex-to-match-string-syntax-in-code)
    src.replace(/(`|"|')(?:(?!\2)(?:\\.|[^\\]))*\2/gs, "");
    // delete all RegExp objects
    src.replace(/\/.+\//g, "");
    // delete all multiline comments
    src.replace(/\/\*.*\*\//gs, "");
    // delete all single line commends
    src.replace(/\/\/.+/g, "");

    // do we still have while(something) in our code?
    return !!src.match(/[^\S]while\(.+\)/s);
};

export const assertType = (object: any, type: string) => {
    if (typeof object !== type)
        throw new Error(object.name ? object.name : object + " should be of type " + type);
};
