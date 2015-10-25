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
  Message, clearMessageData, sendMessage
} from 'phosphor-messaging';

import {
  Property
} from 'phosphor-properties';

import {
  attachWidget, detachWidget, MSG_LAYOUT_REQUEST, ResizeMessage, Widget
} from 'phosphor-widget';

import {
  Orientation, SplitPanel
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


function triggerMouseEvent(node: HTMLElement, eventType: string, options: any = {}) {
  options.bubbles = true;
  var clickEvent = new MouseEvent(eventType, options);
  node.dispatchEvent(clickEvent);
}


describe('phosphor-splitpanel', () => {

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

      it('should toggle the orientation classes', () => {
        var panel = new SplitPanel();
        expect(panel.hasClass('p-mod-horizontal')).to.be(true);
        expect(panel.hasClass('p-mod-vertical')).to.be(false);
        SplitPanel.orientationProperty.set(panel, Orientation.Vertical);
        expect(panel.hasClass('p-mod-horizontal')).to.be(false);
        expect(panel.hasClass('p-mod-vertical')).to.be(true);
      });

      it('should post a `layout-request`', (done) => {
        var panel = new LogPanel();
        SplitPanel.orientationProperty.set(panel, Orientation.Vertical);
        expect(panel.messages.indexOf('layout-request')).to.be(-1);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('.spacingProperty', () => {

      it('should be a property descriptor', () => {
        expect(SplitPanel.spacingProperty instanceof Property).to.be(true);
      });

      it('should default to `3`', () => {
        var panel = new SplitPanel();
        expect(SplitPanel.spacingProperty.get(panel)).to.be(3);
      });

      it('should post a `layout-request`', (done) => {
        var panel = new LogPanel();
        SplitPanel.spacingProperty.set(panel, 4);
        expect(panel.messages.indexOf('layout-request')).to.be(-1);
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

      it('should default to `0`', () => {
        var widget = new Widget();
        expect(SplitPanel.stretchProperty.get(widget)).to.be(0);
      });

      it('should post a `layout-request`', (done) => {
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

      it('should add the `p-SplitPanel` class', () => {
        var panel = new SplitPanel();
        expect(panel.hasClass('p-SplitPanel')).to.be(true);
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

    describe('#spacing', () => {

      it('should get the inter-element spacing', () => {
        var panel = new SplitPanel();
        expect(panel.spacing).to.be(3);
      });

      it('should set the inter-element spacing', () => {
        var panel = new SplitPanel();
        panel.spacing = 5;
        expect(panel.spacing).to.be(5);
      });

      it('should a pure delegate to the spacingProperty', () => {
        var panel = new SplitPanel();
        SplitPanel.spacingProperty.set(panel, 2);
        expect(panel.spacing).to.be(2);
        panel.spacing = 5;
        expect(SplitPanel.spacingProperty.get(panel)).to.be(5);
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

    describe('#onChildAdded()', () => {

      it('should be invoked when a child is added', () => {
        var panel = new LogPanel();
        var widget = new LogWidget();
        attachWidget(panel, document.body);
        panel.children = [widget];
        expect(panel.messages.indexOf('child-added')).to.not.be(-1);
      });

      it('should send `after-attach` to the child', () => {
        var panel = new LogPanel();
        var widget = new LogWidget();
        attachWidget(panel, document.body);
        panel.children = [widget];
        expect(widget.messages.indexOf('after-attach')).to.not.be(-1);
      });

      it('should post a `layout-request`', (done) => {
        var panel = new LogPanel();
        var widget = new LogWidget();
        attachWidget(panel, document.body);
        expect(panel.messages.indexOf('layout-request')).to.be(-1);
        panel.children = [widget];
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onChildRemoved()', () => {

      it('should be invoked when a child is removed', () => {
        var panel = new LogPanel();
        var widget = new Widget();
        attachWidget(panel, document.body);
        panel.children = [widget];
        expect(panel.messages.indexOf('child-removed')).to.be(-1);
        panel.children = [];
        expect(panel.messages.indexOf('child-removed')).to.not.be(-1);
      });

      it('should send `before-detach` to the child', () => {
        var panel = new LogPanel();
        var widget = new LogWidget();
        attachWidget(panel, document.body);
        panel.children = [widget];
        expect(widget.messages.indexOf('before-detach')).to.be(-1);
        panel.children = [];
        expect(widget.messages.indexOf('before-detach')).to.not.be(-1);
      });

      it('should be post a `layout-request`', (done) => {
        var panel = new LogPanel();
        var widget = new Widget();
        attachWidget(panel, document.body);
        panel.children = [widget];
        clearMessageData(panel);
        panel.messages = [];
        panel.children = [];
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onChildMoved()', () => {

      it('should be invoked when a child is moved', () => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        attachWidget(panel, document.body);
        panel.messages = [];
        panel.moveChild(1, 0);
        expect(panel.messages.indexOf('child-moved')).to.not.be(-1);
      });

      it('should reorder the sizes appropriately', () => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        panel.setSizes([0.3, 0.7]);
        attachWidget(panel, document.body);
        panel.messages = [];
        panel.moveChild(1, 0);
        expect(panel.sizes()).to.eql([0.7, 0.3]);
      });

      it('should post a `layout-request`', (done) => {
        var panel = new LogPanel();
        var widget0 = new Widget();
        var widget1 = new Widget();
        panel.children = [widget0, widget1];
        attachWidget(panel, document.body);
        clearMessageData(panel);
        panel.messages = [];
        panel.moveChild(1, 0);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onAfterShow()', () => {

      it('should send an `update-request`', () => {
        var panel = new LogPanel();
        attachWidget(panel, document.body);
        panel.hidden = true;
        panel.messages = [];
        panel.hidden = false;
        expect(panel.messages.indexOf('update-request')).to.not.be(-1);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should post a `layout-request`', (done) => {
        var panel = new LogPanel();
        attachWidget(panel, document.body);
        expect(panel.messages.indexOf('layout-request')).to.be(-1);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should be invoked on detach', () => {
        var panel = new LogPanel();
        attachWidget(panel, document.body);
        expect(panel.messages.indexOf('before-detach')).to.be(-1);
        detachWidget(panel);
        expect(panel.messages.indexOf('before-detach')).to.not.be(-1);
      });

    });

    describe('#onChildShown()', () => {

      it('should post a `layout-request`', (done) => {
        var panel = new LogPanel();
        var widget = new Widget();
        widget.hidden = true;
        panel.children = [widget];
        attachWidget(panel, document.body);
        clearMessageData(panel);
        panel.messages = [];
        widget.hidden = false;
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onChildHidden()', () => {

      it('should post a `layout-request`', (done) => {
        var panel = new LogPanel();
        var widget = new Widget();
        panel.children = [widget];
        attachWidget(panel, document.body);
        clearMessageData(panel);
        panel.messages = [];
        widget.hidden = true;
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onResize()', () => {

      it('should be invoked on `resize` message', () => {
        var panel = new LogPanel();
        var message = new ResizeMessage(100, 100);
        attachWidget(panel, document.body);
        sendMessage(panel, message);
        expect(panel.messages.indexOf('resize')).to.not.be(-1);
      });

      it('should handle an unknown size', () => {
        var panel = new LogPanel();
        attachWidget(panel, document.body);
        sendMessage(panel, ResizeMessage.UnknownSize);
        expect(panel.messages.indexOf('resize')).to.not.be(-1);
      });

      it('should resize the children', () => {
        var panel = new SplitPanel();
        var child0 = new Widget();
        var child1 = new Widget();
        panel.orientation = Orientation.Vertical;
        panel.children = [child0, child1];
        attachWidget(panel, document.body);
        panel.node.style.position = 'absolute';
        sendMessage(panel, MSG_LAYOUT_REQUEST);
        panel.setOffsetGeometry(0, 0, 101, 101);
        var r1 = child0.offsetRect;
        var r2 = child1.offsetRect;
        expect(r1).to.eql({ left: 0, top: 0, width: 101, height: 49 });
        expect(r2).to.eql({ left: 0, top: 52, width: 101, height: 49 });
      });

    });

    describe('#onUpdate()', () => {

      it('should be invoked on an `update-request` message', () => {
        var panel = new LogPanel();
        panel.update(true);
        expect(panel.messages.indexOf('update-request')).to.not.be(-1);
      });

      it('should resize the children', () => {
        var panel = new SplitPanel();
        var child0 = new Widget();
        var child1 = new Widget();
        panel.orientation = Orientation.Vertical;
        panel.children = [child0, child1];
        attachWidget(panel, document.body);
        panel.node.style.position = 'absolute';
        sendMessage(panel, MSG_LAYOUT_REQUEST);
        panel.node.style.top = '0px';
        panel.node.style.left = '0px';
        panel.node.style.width = '201px';
        panel.node.style.height = '201px';
        panel.update(true);
        var r1 = child0.offsetRect;
        var r2 = child1.offsetRect;
        expect(r1).to.eql({ left: 0, top: 0, width: 201, height: 99 });
        expect(r2).to.eql({ left: 0, top: 102, width: 201, height: 99 });
      });

    });

    describe('#onLayoutRequest()', () => {

      it('should be invoked on a `layout-request` message', () => {
        var panel = new LogPanel();
        sendMessage(panel, MSG_LAYOUT_REQUEST);
        expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
      });

      it('should send a `layout-request` to its parent', () => {
        var panel1 = new LogPanel();
        var panel2 = new LogPanel();
        panel2.parent = panel1;
        attachWidget(panel1, document.body);
        clearMessageData(panel1);
        clearMessageData(panel2);
        expect(panel1.messages.indexOf('layout-request')).to.be(-1);
        sendMessage(panel2, MSG_LAYOUT_REQUEST);
        expect(panel1.messages.indexOf('layout-request')).to.not.be(-1);
      });

      it('should setup the geometry of the panel', () => {
        var panel = new SplitPanel();
        var child = new Widget();
        child.node.style.minWidth = '50px';
        child.node.style.minHeight = '50px';
        panel.children = [child];
        attachWidget(panel, document.body);
        expect(panel.node.style.minWidth).to.be('');
        expect(panel.node.style.minHeight).to.be('');
        sendMessage(panel, MSG_LAYOUT_REQUEST);
        expect(panel.node.style.minWidth).to.be('50px');
        expect(panel.node.style.minHeight).to.be('50px');
      });

    });

    context('mouse handling', () => {

      it('should adjust children on a handle grab and move', (done) => {
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

      it('should ignore anything except the left mouse button', (done) => {
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

      it('should handle vertical orientation', (done) => {
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

      it('should be a no-op if a split handle is not pressed', (done) => {
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

      it('should be a no-op if the mouse does not move', (done) => {
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

    context('resize behavior', () => {

      it('should handle `Horizontal`', () => {
        var panel = new SplitPanel();
        var child0 = new Widget();
        var child1 = new Widget();
        var child2 = new Widget();
        child2.hidden = true;
        panel.spacing = 8;
        panel.orientation = Orientation.Horizontal;
        child0.node.style.minWidth = '30px';
        child1.node.style.minHeight = '50px';
        panel.children = [child0, child1, child2];
        attachWidget(panel, document.body);
        panel.node.style.position = 'absolute';
        sendMessage(panel, MSG_LAYOUT_REQUEST);
        panel.setOffsetGeometry(0, 0, 50, 100);
        var r1 = child0.offsetRect;
        var r2 = child1.offsetRect;
        expect(r1).to.eql({ left: 0, top: 0, width: 36, height: 100 });
        expect(r2).to.eql({ left: 44, top: 0, width: 6, height: 100 });
        expect(panel.node.style.minWidth).to.be('38px');
        expect(panel.node.style.minHeight).to.be('50px');
      });

      it('should handle `Vertical`', () => {
        var panel = new SplitPanel();
        var child0 = new Widget();
        var child1 = new Widget();
        var child2 = new Widget();
        child2.hidden = true;
        panel.spacing = 8;
        panel.orientation = Orientation.Vertical;
        child0.node.style.minWidth = '30px';
        child1.node.style.minHeight = '50px';
        panel.children = [child0, child1, child2];
        attachWidget(panel, document.body);
        panel.node.style.position = 'absolute';
        sendMessage(panel, MSG_LAYOUT_REQUEST);
        panel.setOffsetGeometry(0, 0, 100, 70);
        var r1 = child0.offsetRect;
        var r2 = child1.offsetRect;
        expect(r1).to.eql({ left: 0, top: 0, width: 100, height: 6 });
        expect(r2).to.eql({ left: 0, top: 14, width: 100, height: 56 });
        expect(panel.node.style.minWidth).to.be('30px');
        expect(panel.node.style.minHeight).to.be('58px');
      });

    });

  });

});
