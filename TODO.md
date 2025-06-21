# TODO

-   Can arg groups be supported?
    -   Perhaps we could use an array of options? Each options object could use a `.describe()` for the name.
-   Can we make use of `.strict()` and `.partial()` on the options object?
-   Where should we add the command description?
-   Can we support sub-commands?
    -   Create a trie of commands and traverse it to a leaf, then the rest are positionals.
-   Can we support zod v4 (and v3 together)?
-   Should aliases be supported?
    -   They could be a separate configuration property.
-   Support configuration options like [`yargs-parser`](https://www.npmjs.com/package/yargs-parser#configuration)
-   Support dot notation in option names
