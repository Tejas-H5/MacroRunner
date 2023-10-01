export const typeAssertRangeArray = (rangeArray: any): [number, number][] => {
    if (!Array.isArray(rangeArray)) {
        throw new Error("range array was not an array");
    }

    for (let i = 0; i < rangeArray.length; i++) {
        if (
            !Array.isArray(rangeArray[i]) ||
            rangeArray[i].length !== 2 ||
            typeof rangeArray[0] !== "number" ||
            typeof rangeArray[1] !== "number"
        ) {
            throw new Error(`rangeArray[${i}] must be an array of numbers of length 2`);
        }

        if (rangeArray[i][0] > rangeArray[i][1]) {
            throw new Error(
                `rangeArray[${i}][0] ${rangeArray[i][0]} was greater than rangeArray[${i}][1] ${rangeArray[i][1]}`
            );
        }
    }

    return rangeArray;
};

export const typeAssertString = (strAny: any): string => {
    if (typeof strAny !== "string") {
        throw new Error("value was not a string");
    }

    return strAny;
};
