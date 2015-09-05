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
  Widget, attachWidget
} from 'phosphor-widget';

import './index.css';


function createContent(name: string): Widget {
  var widget = new Widget();
  widget.addClass('content');
  widget.addClass(name);
  return widget;
}


function main(): void {
  var red1 = createContent('red');
  var red2 = createContent('red');

  var yellow1 = createContent('yellow');
  var yellow2 = createContent('yellow');

  var green1 = createContent('green');
  var green2 = createContent('green');

  var blue1 = createContent('blue');
  var blue2 = createContent('blue');

  var sp3 = new SplitPanel();
  sp3.orientation = SplitPanel.Vertical;
  sp3.children = [red1, green1, blue1];

  var sp2 = new SplitPanel();
  sp2.orientation = SplitPanel.Horizontal;
  sp2.children = [sp3, yellow1, red2];

  var sp1 = new SplitPanel();
  sp1.orientation = SplitPanel.Vertical;
  sp1.children = [yellow2, blue2, sp2, green2];
  sp1.id = 'main';

  attachWidget(sp1, document.body);

  window.onresize = () => sp1.update();
}


window.onload = main;
