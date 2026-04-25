"use strict"

/**
  * @param {string} content
  * @param {(classNames: string[]) => [ string, bigint | null ][]} get_class_order 
  * @returns {{ start: number, end: number, formatted: string }[]}
  */
export function format(content, get_class_order) {
    const result = []

    const it = matchIterator(content)
    while (true) {
        const match = it.next()
        if (match === null) {
            return result
        }

        const matches = [...match.matchAll(/\S+/g)]
        const classes = matches.map(m => m[0])

        if (classes.length < 1) {
            continue
        }

        const end = it.idx - 1
        const start = end - match.length

        const sorted = sort(get_class_order(classes)).split(" ")

        let formatted = ""
        let idx = 0

        for (const [i, m] of matches.entries()) {
            formatted += match.slice(idx, m.index)
            formatted += sorted[i]
            idx = m.index + m[0].length
        }

        formatted += match.slice(idx)
        if (match == formatted) {
            continue
        }

        result.push({
            end,
            start,
            formatted,
        })
    }
}

/**
  * @param {[ string, bigint | null ][]} class_order
  * @returns string
  */
function sort(class_order) {
    let result = ""

    const known = []
    let unknown = ""

    for (const item of class_order) {
        const [ className, order ] = item
        if (order !== null) {
            known.push(item)
            continue
        }

        const prefix = unknown.length == 0 ? "" : " "
        unknown += prefix + className
    }

    known.sort((a, b) => {
        return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0
    })

    for (const [ className ] of known) {
        const prefix = result.length == 0 ? "" : " "
        result += prefix + className
    }

    const join = (result.length === 0 || unknown.length === 0) ? "" : " "
    return result + join + unknown
}

/**
  * @param {string} content
  * @returns {{ idx: number, next: () => string | null }}
  */
export function matchIterator(content) {
    return { 
        idx: 0,
        next: function () {
            let match
            let idx = 0;

            match = /(?<!\\)(?:\\\\)*(["'])/.exec(content)
            idx = match ? match.index + match[0].length - 1 : -1;

            if (idx === -1 || ++idx === content.length) {
                return (content = "", null)
            }

            const quote = content[idx - 1]
            const start = idx;

            content = content.slice(idx)

            const regex = new RegExp(`(?<!\\\\)(?:\\\\\\\\)*(${quote})`);

            match = regex.exec(content);
            idx = match ? match.index + match[0].length - 1 : -1;

            if (idx === -1) {
                return (content = "", null)
            }

            const classes = content.slice(0, idx++)

            content = content.slice(idx)
            this.idx += start + idx;

            return classes;
        }
    }
}
