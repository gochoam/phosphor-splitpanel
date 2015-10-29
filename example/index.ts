/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use-strict';

import {
  SplitPanel
} from '../lib/index';

import {
  Widget
} from 'phosphor-widget';

import './index.css';


function createContent(name: string): Widget {
  let widget = new Widget();
  widget.addClass('content');
  widget.addClass(name);
  return widget;
}


function main(): void {
  let red1 = createContent('red');
  let red2 = createContent('red');

  let yellow1 = createContent('yellow');
  let yellow2 = createContent('yellow');

  let green1 = createContent('green');
  let green2 = createContent('green');

  let blue1 = createContent('blue');
  let blue2 = createContent('blue');

  let sp3 = new SplitPanel();
  sp3.orientation = SplitPanel.Vertical;
  sp3.children = [red1, green1, blue1];

  let sp2 = new SplitPanel();
  sp2.orientation = SplitPanel.Horizontal;
  sp2.children = [sp3, yellow1, red2];

  let sp1 = new SplitPanel();
  sp1.orientation = SplitPanel.Vertical;
  sp1.children = [yellow2, blue2, sp2, green2];
  sp1.id = 'main';

  Widget.attach(sp1, document.body);

  window.onresize = () => sp1.update();
}


window.onload = main;
