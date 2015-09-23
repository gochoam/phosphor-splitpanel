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
  Message, postMessage, sendMessage
} from 'phosphor-messaging';

import {
  Property
} from 'phosphor-properties';

import {
  attachWidget, Widget
} from 'phosphor-widget';

import {
  HIDDEN_CLASS, HORIZONTAL_CLASS, OVERLAY_CLASS, SPLIT_HANDLE_CLASS,
  SPLIT_PANEL_CLASS, VERTICAL_CLASS, Orientation, SplitPanel
} from '../../lib/index';


class LogPanel extends SplitPanel {

  messages: string[] = [];

  processMessage(msg: Message): void {
    super.processMessage(msg);
    this.messages.push(msg.type);
  }
}



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

    describe('.orientationProperty', () => {

      it('should be a property descriptor', () => {
        expect(SplitPanel.orientationProperty instanceof Property).to.be(true);
      });

      it('should default to `Horizontal`', () => {
        var panel = new SplitPanel();
        var orientation = SplitPanel.orientationProperty.get(panel);
        expect(orientation).to.be(Orientation.Horizontal);
      });

      it('should toggle the presence of `HORIZONTAL_CLASS`', () => {
        var panel = new SplitPanel();
        expect(panel.hasClass(HORIZONTAL_CLASS)).to.be(true);
        expect(panel.hasClass(VERTICAL_CLASS)).to.be(false);
        SplitPanel.orientationProperty.set(panel, Orientation.Vertical);
        expect(panel.hasClass(HORIZONTAL_CLASS)).to.be(false);
        expect(panel.hasClass(VERTICAL_CLASS)).to.be(true);
      });

      it('should post `layout-request`', () => {
        var panel = new LogPanel();
        attachWidget(panel, document.body);
        SplitPanel.orientationProperty.set(panel, Orientation.Vertical);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
        });
      });

    });

    describe('.handleSizeProperty', () => {

      it('should be a property descriptor', () => {
        expect(SplitPanel.handleSizeProperty instanceof Property).to.be(true);
      });

      it('should default to 3', () => {
        var panel = new SplitPanel();
        expect(SplitPanel.handleSizeProperty.get(panel)).to.be(3);
      });

      it('should post `layout-request`', () => {
        var panel = new LogPanel();
        attachWidget(panel, document.body);
        SplitPanel.handleSizeProperty.set(panel, 4);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
        });
      });

    });

    describe('.stretchProperty', () => {

      it('should be a property descriptor', () => {
        expect(SplitPanel.stretchProperty instanceof Property).to.be(true);
      });

      it('should default to 0', () => {
        var widget = new Widget();
        expect(SplitPanel.stretchProperty.get(widget)).to.be(0);
      });

    });

     describe('.getStretch', () => {

      it('should return the panel stretch factor for the given widget', () => {
        var widget = new Widget();
        expect(SplitPanel.getStretch(widget)).to.be(0);
      });

      it('should be a pure delegate to stretchProperty', () => {
        var widget = new Widget();
        SplitPanel.stretchProperty.set(widget, 1);
        expect(SplitPanel.getStretch(widget)).to.be(1);
      });

    });


    describe('.setStretch', () => {

      it('should set the split panel stretch factor for the given widget.', () => {
        var widget = new Widget();
        SplitPanel.setStretch(widget, 1);
        expect(SplitPanel.getStretch(widget)).to.be(1);
      });

      it('should be a pure delegate to stretchProperty', () => {
        var widget = new Widget();
        SplitPanel.setStretch(widget, 1);
        expect(SplitPanel.stretchProperty.get(widget)).to.be(1);
      });

    });

  });

});
