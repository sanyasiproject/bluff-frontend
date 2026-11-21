/** exact English line → Hindi */
export type Dict = Record<string, string>;

/** turns a captured piece (a rank, a count) into Hindi, or leaves it */
export type Tr = (text: string) => string;

/** a whole line matched by a regex; captures are names, numbers, codes unless the replacer translates them */
export type Pattern = [RegExp, string | ((m: RegExpExecArray, tr: Tr) => string)];
