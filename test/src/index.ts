/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import expect = require('expect.js');


import {
  HIDDEN_CLASS, HORIZONTAL_CLASS, OVERLAY_CLASS, SPLIT_HANDLE_CLASS,
  SPLIT_PANEL_CLASS, VERTICAL_CLASS, Orientation, SplitPanel
} from '../../lib/index';

describe('phosphor-splitpanel', () => {


  describe('HIDDEN_CLASS', () => {

    it('should equal `p-mod-hidden`', () => {
      expect(HIDDEN_CLASS).to.be('p-mod-hidden');
    });

  });

  describe('HORIZONTAL_CLASS', () => {

    it('should equal `p-mod-horizontal`', () => {
      expect(HORIZONTAL_CLASS).to.be('p-mod-horizontal');
    });

  });

  describe('OVERLAY_CLASS', () => {

    it('should equal `p-SplitHandle-overlay`', () => {
      expect(OVERLAY_CLASS).to.be('p-SplitHandle-overlay');
    });

  });

  describe('SPLIT_HANDLE_CLASS', () => {

    it('should equal `p-SplitHandle`', () => {
      expect(SPLIT_HANDLE_CLASS).to.be('p-SplitHandle');
    });

  });

  describe('SPLIT_PANEL_CLASS', () => {

    it('should equal `p-SplitPanel`', () => {
      expect(SPLIT_PANEL_CLASS).to.be('p-SplitPanel');
    });

  });

  describe('VERTICAL_CLASS', () => {

    it('should equal `p-mod-vertical`', () => {
      expect(VERTICAL_CLASS).to.be('p-mod-vertical');
    });

  });

  describe('SplitPanel', () => {

    describe('.Horizontal', () => {

      it('should be an alias of the `Horizontal` Orientation', () => {
          expect(SplitPanel.Horizontal).to.be(Orientation.Horizontal);
      });

    });

    describe('.Vertical', () => {

      it('should be an alias of the `Vertical` Orientation', () => {
          expect(SplitPanel.Vertical).to.be(Orientation.Vertical);
      });

    });

  });

});
