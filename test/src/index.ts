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
  Message, clearMessageData, postMessage, sendMessage
} from 'phosphor-messaging';

import {
  Property
} from 'phosphor-properties';

import {
  attachWidget, detachWidget, ResizeMessage, Widget
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

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.messages.push(event.type);
  }

}


class LogWidget extends Widget {

  messages: string[] = [];

  processMessage(msg: Message): void {
    super.processMessage(msg);
    this.messages.push(msg.type);
  }
}


function triggerMouseEvent (node: HTMLElement, eventType: string, options: any={}) {
  options.bubbles = true;
  var clickEvent = new MouseEvent(eventType, options);
  node.dispatchEvent(clickEvent);
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

      it('should post `layout-request`', (done) => {
        var panel = new LogPanel();
        SplitPanel.orientationProperty.set(panel, Orientation.Vertical);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
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

      it('should post `layout-request`', (done) => {
        var panel = new LogPanel();
        SplitPanel.handleSizeProperty.set(panel, 4);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
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

      it('should post `layout-request`', (done) => {
        var panel = new LogPanel();
        var widget = new Widget();
        panel.addChild(widget);
        clearMessageData(panel);
        SplitPanel.stretchProperty.set(widget, 4);
        expect(panel.messages.indexOf('layout-request')).to.be(-1);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
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

    describe('#constructor()', () => {

      it('should accept no arguments', () => {
        var panel = new SplitPanel();
        expect(panel instanceof SplitPanel).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the panel', () => {
        var panel = new SplitPanel();
        panel.children = [new Widget(), new Widget()];
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
        expect(panel.sizes.length).to.be(0);
      });

    });

    describe('#orientation', () => {

      it('should get the orientation of the split panel', () => {
        var panel = new SplitPanel();
        expect(panel.orientation).to.be(Orientation.Horizontal);
      });

      it('should set the orientation of the split panel', () => {
        var panel = new SplitPanel();
        panel.orientation = Orientation.Vertical
        expect(panel.orientation).to.be(Orientation.Vertical);
      });

      it('should a pure delegate to the orientationProperty', () => {
        var panel = new SplitPanel();
        SplitPanel.orientationProperty.set(panel, Orientation.Vertical);
        expect(panel.orientation).to.be(Orientation.Vertical);
        panel.orientation = Orientation.Horizontal;
        var orientation = SplitPanel.orientationProperty.get(panel);
        expect(orientation).to.be(Orientation.Horizontal);
      });

    });

    describe('#handleSize', () => {

      it('should get the size of the split handles', () => {
        var panel = new SplitPanel();
        expect(panel.handleSize).to.be(3);
      });

      it('should set the size of the split handles', () => {
        var panel = new SplitPanel();
        panel.handleSize = 5;
        expect(panel.handleSize).to.be(5);
      });

      it('should a pure delegate to the handleSizeProperty', () => {
        var panel = new SplitPanel();
        SplitPanel.handleSizeProperty.set(panel, 2);
        expect(panel.handleSize).to.be(2);
        panel.handleSize = 5;
        expect(SplitPanel.handleSizeProperty.get(panel)).to.be(5);
      });

    });

    describe('#sizes()', () => {

      it('should get the normalized sizes of the widgets in the panel', () => {
        var panel = new SplitPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        expect(panel.sizes()).to.eql([0.5, 0.5]);
        panel.setSizes([2, 3]);
        expect(panel.sizes()).to.eql([0.4, 0.6]);
      });

    });

    describe('#setSizes()', () => {

      it('should set the relative sizes for the child widgets in the panel', () => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        attachWidget(panel, document.body);
        panel.setSizes([1, 4]);
        expect(panel.sizes()).to.eql([0.2, 0.8]);
      });

    });

    describe('#handleEvent()', () => {

      it('should be invoked during a handle grab and move', (done) => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        attachWidget(panel, document.body);
        requestAnimationFrame(() => {
          var handle = panel.node.children[1] as HTMLElement;
          var left = handle.offsetLeft;
          triggerMouseEvent(handle, 'mousedown');
          triggerMouseEvent(handle, 'mousemove', { clientX: 20 });
          triggerMouseEvent(handle, 'mouseup');
          triggerMouseEvent(handle, 'mousedown');
          triggerMouseEvent(handle, 'mousemove', { clientX: -40 });
          triggerMouseEvent(handle, 'mouseup');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.not.be(-1);
          expect(panel.messages.indexOf('mouseup')).to.not.be(-1);
          requestAnimationFrame(() => {
            expect(handle.offsetLeft).to.be.lessThan(left - 10);
            done();
          });
        });
      });

      it('should ignore anything but the left button', (done) => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        attachWidget(panel, document.body);
        requestAnimationFrame(() => {
          var handle = panel.node.children[1] as HTMLElement;
          triggerMouseEvent(handle, 'mousedown', { button: 1} );
          triggerMouseEvent(handle, 'mousemove');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.be(-1);
          done();
        });
      });

      it('should work for vertical orientation', (done) => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        panel.orientation = Orientation.Vertical;
        attachWidget(panel, document.body);
        requestAnimationFrame(() => {
          var handle = panel.node.children[1] as HTMLElement;
          triggerMouseEvent(handle, 'mousedown');
          triggerMouseEvent(handle, 'mousemove', { clientY: 10 });
          triggerMouseEvent(handle, 'mouseup');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.not.be(-1);
          expect(panel.messages.indexOf('mouseup')).to.not.be(-1);
          done();
        });
      });

      it('should be a no-op if not on a handle', (done) => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        panel.orientation = Orientation.Vertical;
        attachWidget(panel, document.body);
        requestAnimationFrame(() => {
          triggerMouseEvent(panel.node, 'mousedown');
          triggerMouseEvent(panel.node, 'mousemove');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.be(-1);
          done();
        });
      });

      it('should ignore a non-left click on mousemove', (done) => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        panel.orientation = Orientation.Vertical;
        attachWidget(panel, document.body);
        requestAnimationFrame(() => {
          var handle = panel.node.children[1] as HTMLElement;
          var left = handle.offsetLeft;
          triggerMouseEvent(handle, 'mousedown');
          triggerMouseEvent(handle, 'mousemove', { button: 1, clientY: 10 });
          triggerMouseEvent(handle, 'mouseup');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.not.be(-1);
          expect(panel.messages.indexOf('mouseup')).to.not.be(-1);
          expect(handle.offsetLeft).to.be(left);
          done();
        });
      });

      it('should ignore a non-left click on mouseup', (done) => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        panel.orientation = Orientation.Vertical;
        attachWidget(panel, document.body);
        requestAnimationFrame(() => {
          var handle = panel.node.children[1] as HTMLElement;
          var left = handle.offsetLeft;
          triggerMouseEvent(handle, 'mousedown');
          triggerMouseEvent(handle, 'mousemove', { clientY: 10 });
          triggerMouseEvent(handle, 'mouseup', { button: 1 });
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.not.be(-1);
          expect(panel.messages.indexOf('mouseup')).to.not.be(-1);
          expect(handle.offsetLeft).to.be(left);
          done();
        });
      });

      it('should be a no-op if we do not move', (done) => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        panel.orientation = Orientation.Vertical;
        attachWidget(panel, document.body);
        requestAnimationFrame(() => {
          var handle = panel.node.children[1] as HTMLElement;
          var left = handle.offsetLeft;
          triggerMouseEvent(handle, 'mousedown');
          triggerMouseEvent(handle, 'mousemove');
          triggerMouseEvent(handle, 'mouseup');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.not.be(-1);
          expect(panel.messages.indexOf('mouseup')).to.not.be(-1);
          expect(handle.offsetLeft).to.be(left);
          done();
        });
      });

    });

    describe('#onChildAdded()', () => {

      it('should be invoked when a child is added', (done) => {
        var panel = new LogPanel();
        var widget = new LogWidget();
        attachWidget(panel, document.body);
        panel.children = [widget];
        expect(panel.messages.indexOf('child-added')).to.not.be(-1);
        expect(panel.messages.indexOf('after-attach')).to.not.be(-1);
        expect(widget.messages.indexOf('after-attach')).to.not.be(-1);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onChildRemoved()', () => {

      it('should be invoked when a child is removed', (done) => {
        var panel = new LogPanel();
        var widget = new Widget();
        panel.children = [widget];
        attachWidget(panel, document.body);
        panel.messages = [];
        panel.children = [];
        expect(panel.messages.indexOf('child-removed')).to.not.be(-1);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onChildMoved()', () => {

      it('should be invoked when a child is moved', (done) => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        panel.setSizes([0.3, 0.7]);
        attachWidget(panel, document.body);
        panel.messages = [];
        panel.moveChild(1, 0);
        expect(panel.messages.indexOf('child-moved')).to.not.be(-1);
        expect(panel.sizes()).to.eql([0.7, 0.3]);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onAfterShow()', () => {

      it('should be invoked when the panel is shown', () => {
        var panel = new LogPanel();
        panel.setSizes([0.3, 0.7]);
        attachWidget(panel, document.body);
        panel.hidden = true;
        panel.hidden = false;
        expect(panel.messages.indexOf('after-show')).to.not.be(-1);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should be invoked when the panel is attached', (done) => {
        var panel = new LogPanel();
        attachWidget(panel, document.body);
        expect(panel.messages.indexOf('after-attach')).to.not.be(-1);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

      it('should handle a variety of configurations', () => {
        var top = new Widget();
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.orientation = Orientation.Vertical;
        widget1.hidden = true;
        panel.children = [widget0, widget1];
        top.children = [panel];
        attachWidget(top, document.body);
        expect(panel.messages.indexOf('after-attach')).to.not.be(-1);
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should be invoked when the panel is detached', () => {
        var panel = new LogPanel();
        attachWidget(panel, document.body);
        detachWidget(panel);
        expect(panel.messages.indexOf('before-detach')).to.not.be(-1);
      });

    });

    describe('#onChildShown()', () => {

      it('should be invoked when a child is shown', (done) => {
        var panel = new LogPanel();
        var widget = new Widget();
        widget.hidden = true;
        panel.children = [widget];
        attachWidget(panel, document.body);
        widget.hidden = false;
        expect(panel.messages.indexOf('child-shown')).to.not.be(-1);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onChildHidden()', () => {

      it('should be invoked when a child is hidden', (done) => {
        var panel = new LogPanel();
        var widget = new Widget();
        panel.children = [widget];
        attachWidget(panel, document.body);
        widget.hidden = true;
        expect(panel.messages.indexOf('child-hidden')).to.not.be(-1);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onResize()', () => {

      it('should be invoked on resize event', () => {
        var panel = new LogPanel();
        var widget = new Widget();
        panel.children = [widget];
        attachWidget(panel, document.body);
        var message = new ResizeMessage(100, 100);
        sendMessage(panel, message);
        expect(panel.messages.indexOf('resize')).to.not.be(-1);
      });

      it('should be handle an unknown size', () => {
        var panel = new LogPanel();
        var widget = new Widget();
        panel.children = [widget];
        attachWidget(panel, document.body);
        sendMessage(panel, ResizeMessage.UnknownSize);
        expect(panel.messages.indexOf('resize')).to.not.be(-1);
      });
    });

    describe('#onUpdate()', () => {

      it('should be invoked on update', () => {
        var panel = new LogPanel();
        var widget = new Widget();
        panel.children = [widget];
        attachWidget(panel, document.body);
        panel.update(true);
        expect(panel.messages.indexOf('update-request')).to.not.be(-1);
      });

    });

    describe('#onLayoutRequest()', () => {

      it('should be invoked when a panel is attached', (done) => {
        var panel = new LogPanel();
        attachWidget(panel, document.body);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

  });

});
