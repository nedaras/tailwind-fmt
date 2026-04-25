import { test } from "uvu"
import * as assert from "uvu/assert"
import { matchIterator } from "../src/format.mjs"

// todo: handle "class=\"escpaed quotes\""

/* 
"$1     $2
     $3   $4
"

"$4     $2
     $1   $3
"
 */

test("match iterator", () => {
    const cases = [
        { 
            data: `<button class="text-white px-4 sm:px-8 py-2 sm:py-3 bg-sky-700 hover:bg-sky-800">...</button>`,
            matches: [ "text-white px-4 sm:px-8 py-2 sm:py-3 bg-sky-700 hover:bg-sky-800" ]
        },

        { 
          data: `<button class="text-white px-4
                                sm:px-8 py-2 sm:py-3 bg-sky-700
                                hover:bg-sky-800">...</button>`,
          matches: [ `text-white px-4
                                sm:px-8 py-2 sm:py-3 bg-sky-700
                                hover:bg-sky-800` ]
        },

        {
            data: `<div \\\\"wow">...</div>`,
            matches: [
                "wow",
            ],
        },

        {
            data: `<div class="\\"" class="\\\\\\"" class="\\\\">...</div>`,
            matches: [
                "\\\"",
                "\\\\\\\"",
                "\\\\",
            ],
        },

        {
            data: `<div class="prefix \\" suffix" class="prefix \\\\\\" suffix" class="prefix \\\\ suffix">...</div>`,
            matches: [
                "prefix \\\" suffix",
                "prefix \\\\\\\" suffix",
                "prefix \\\\ suffix",
            ],
        },

        {
            data: `<div class\r\n   =\t   \r\n "white spaces">...</div>`,
            matches: [ "white spaces" ],
        },

        {
            data: `<divclass="white spaces">...</div>`,
            matches: ["white spaces"],
        },

        {
            data: `<div class="" class=" ">...</div>`,
            matches: [
                "", 
                " "
            ],
        },

        {
            data: `<div class\t=\t'opened class='bg-white'">...</div>`,
            matches: [ "opened class=" ],
        },

        {
            data: `<div class\r=\t'hello">...</div>`,
            matches: [],
        },

        {
            data: `<div class="">...</div>`,
            matches: [ "" ],
        },

        {
            data: `<div CLASS="uppercase">...</div>`,
            matches: ["uppercase"],
        },

        {
            data: `<div class="class" classb="classb">...</div>`,
            matches: [ "class", "classb" ],
        },

        {
            data: `<div class="both" class="valid">...</div>`,
            matches: [ 
                "both",
                "valid",
            ],
        },

        {
            data: `<div class class="valid">...</div>`,
            matches: [ "valid" ],
        },

        {
            data: `<div class== class="valid"">...</div>`,
            matches: [ "valid" ],
        },

        {
            data: `<div class=/" class="valid" id="1""">...</div>`,
            matches: [ " class=", " id=", "" ],
        },

        {
            data: `<div class=\\" class="valid" id="1""">...</div>`,
            matches: [ "valid", "1", "" ],
        },

        {
            data: `<div class=/"class="not valid" id="1""">...</div>`,
            matches: [ "class=", " id=", "" ],
        },

        {
            data: `<div class="class='not valid'">...</div>`,
            matches: [ "class='not valid'" ],
        },

        {
            data: `<div class="text-red-500 \\"bg-blue\\">">...</div>`,
            matches: [ "text-red-500 \\\"bg-blue\\\">" ],
        },

        {
            data: `
package button

import "patikimai.lt/internal/components/utils"

type Variant string
type Size string
type Type string

const (
VariantPrimary   Variant = "primary"
VariantSecondary Variant = "secondary"
VariantOutline   Variant = "outline"
)

const (
SizeBase Size = "base"
SizeSm   Size = "sm"
SizeLg   Size = "lg"
)

const (
TypeButton Type = "button"
TypeReset  Type = "reset"
TypeSubmit Type = "submit"
)

type Props struct {
ID         string
Class      string
Attributes templ.Attributes
Variant    Variant
Size       Size
//Expand     bool
Disabled bool
Type     Type
}

templ Button(props ...Props) {
{{ var p Props }}
if len (props) > 0 {
{{ p = props[0] }}
}
if p.Type == "" {
{{ p.Type = TypeButton }}
}
<button
if p.ID != "" {
id={ p.ID }
}
class={ utils.TwMerge(
"outline-none cursor-pointer rounded-md px-6 h-10 text-center whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none transition-opacity hover:opacity-90",
p.variantClasses(),
p.Class,
) }
type={ p.Type }
disabled?={ p.Disabled }
{ p.Attributes... }
>
{ children... }
</button>
}

func (p Props) variantClasses() string {
switch p.Variant {
case VariantSecondary:
return ""
case VariantOutline:
return "border-2 text-green-900"
default:
return "bg-linear-to-br from-green-900 to-green-800 text-white"
}
}
`,
            matches: [
                "patikimai.lt/internal/components/utils",
                "primary",
                "secondary",
                "outline",
                "base",
                "sm",
                "lg",
                "button",
                "reset",
                "submit",
                "",
                "",
                "outline-none cursor-pointer rounded-md px-6 h-10 text-center whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none transition-opacity hover:opacity-90",
                "",
                "border-2 text-green-900",
                "bg-linear-to-br from-green-900 to-green-800 text-white",
            ],
        },
    ]

    for (const { data, matches } of cases) {
        const it = matchIterator(data)
        for (const match of matches) {
            assert.equal(it.next(), match)
        }
        assert.is(it.next(), null)
        assert.is(it.next(), null)
    }
})

test.run()
