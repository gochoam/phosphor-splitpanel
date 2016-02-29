phosphor-splitpanel
===================

[![Build Status](https://travis-ci.org/phosphorjs/phosphor-splitpanel.svg)](https://travis-ci.org/phosphorjs/phosphor-splitpanel?branch=master)
[![Coverage Status](https://coveralls.io/repos/phosphorjs/phosphor-splitpanel/badge.svg?branch=master&service=github)](https://coveralls.io/github/phosphorjs/phosphor-splitpanel?branch=master)

This module provides a Phosphor layout panel which arranges its children into
resizable sections. The user can easily nest panels that will automatically
split and rearrange themselves providing a straightforward way of creating
a high-quality flexible interfaces.


Package Install
---------------

**Prerequisites**
- [node](http://nodejs.org/)

```bash
npm install --save phosphor-splitpanel
```


Source Build
------------

**Prerequisites**
- [git](http://git-scm.com/)
- [node](http://nodejs.org/)

```bash
git clone https://github.com/phosphorjs/phosphor-splitpanel.git
cd phosphor-splitpanel
npm install
```

**Rebuild**
```bash
npm run clean
npm run build
```


Run Tests
---------

Follow the source build instructions first.

```bash
# run tests in Firefox
npm test

# run tests in Chrome
npm run test:chrome

# run tests in IE
npm run test:ie
```


Build Docs
----------

Follow the source build instructions first.

```bash
npm run docs
```

Navigate to `docs/index.html`.


Build Example
-------------

Follow the source build instructions first.

```bash
npm run build:example
```

Navigate to `example/index.html`.


Supported Runtimes
------------------

The runtime versions which are currently *known to work* are listed below.
Earlier versions may also work, but come with no guarantees.

- IE 11+
- Firefox 32+
- Chrome 38+


Bundle for the Browser
----------------------

Follow the package install instructions first.

Any bundler that understands how to `require()` files with `.js` and `.css`
extensions can be used with this package.


Usage Examples
--------------

**Note:** This module is fully compatible with Node/Babel/ES6/ES5. Simply
omit the type declarations when using a language other than TypeScript.

Phosphor split panels have methods to easily arrange widgets in a row or a
column, grouping them into resizable sections.

The following code imports the required modules and creates some content for
the panels:


```typescript
import {
  SplitPanel
} from 'phosphor-splitpanel';

import {
  Widget
} from 'phosphor-widget';

// Create some content for the panel.
function createContent(name: string): Widget {
  let widget = new Widget();
  widget.addClass('content');
  widget.addClass(name);
  return widget;
}

let red1 = createContent('red');
let red2 = createContent('red');
let yellow1 = createContent('yellow');
let green1 = createContent('green');
let blue1 = createContent('blue');
```

Now some of these widgets are put into a subpanel with a basic layout. The
`.orientation` in this case is set to `Vertical` which stacks the widgets
into column. Another possibility is `Horizontal` to get the opposite
orientation and arrange the widgets into a row.

Each new widget is inserted into the subpanel by the `.addChild()` method.

```typescript
let subpanel = new SplitPanel();
subpanel.orientation = SplitPanel.Vertical;
subpanel.addChild(red1);
subpanel.addChild(green1);
subpanel.addChild(blue1);
```

To change the size of the widgets in the main split panel `.setStretch()` takes
two arguments, the widget and the stretch factor. Te stretch factor is a number
representing the relative weight of each widget inside the panel. In this case
the `subpanel` is 3 times as big as `yellow1`, which is half the size of
`red2`.

```typescript
// Set the widget stretch factors (optional).
SplitPanel.setStretch(subpanel, 3);
SplitPanel.setStretch(yellow1, 1);
SplitPanel.setStretch(red2, 2);
```

To set up the main panel you just have to add the corresponding widgets with
`.addChild()`. The separation between adjacent panels can be adjusted with
`.spacing`.

```typescript
let panel = new SplitPanel();
panel.orientation = SplitPanel.Horizontal;
panel.addChild(subpanel);
panel.addChild(yellow1);
panel.addChild(red2);
panel.spacing = 6;
panel.id = 'main';

window.onresize = () => { panel.update(); };
window.onload = () => { panel.attach(document.body); };
```

Split panels inherit all the methods from the
[base Widget class](http://phosphorjs.github.io/phosphor-widget/api/), which
makes it easy to set id and toggle the CSS classes.

To change the sizes of the widgets in a panel use `setSizes()`. This method
takes as argument a numeric array with the relative sizes that will be
normalized to accommodate the available layout space.

```typescript
// sometime later...

// Get the normalized relative widget sizes.
let sizes = panel.sizes();

// Set the relative widget sizes.
panel.setSizes([2, 4, 1]);
```

API
---

[API Docs](http://phosphorjs.github.io/phosphor-splitpanel/api/)
