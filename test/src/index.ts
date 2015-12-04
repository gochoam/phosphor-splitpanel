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
  Panel, ResizeMessage, Widget
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
  let clickEvent = new MouseEvent(eventType, options);
  node.dispatchEvent(clickEvent);
}


function triggerKeyboardEvent(node: HTMLElement, eventType: string, options: any = {}) {
  options.bubbles = true;
  let keyboardEvent = new KeyboardEvent(eventType, options);
  node.dispatchEvent(keyboardEvent);
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

      it('should have the name `orientation`', () => {
        expect(SplitPanel.orientationProperty.name).to.be('orientation');
      });

      it('should default to `Horizontal`', () => {
        let panel = new SplitPanel();
        let orientation = SplitPanel.orientationProperty.get(panel);
        expect(orientation).to.be(Orientation.Horizontal);
      });

      it('should toggle the orientation classes', () => {
        let panel = new SplitPanel();
        expect(panel.hasClass('p-mod-horizontal')).to.be(true);
        expect(panel.hasClass('p-mod-vertical')).to.be(false);
        SplitPanel.orientationProperty.set(panel, Orientation.Vertical);
        expect(panel.hasClass('p-mod-horizontal')).to.be(false);
        expect(panel.hasClass('p-mod-vertical')).to.be(true);
      });

      it('should post a `layout-request`', (done) => {
        let panel = new LogPanel();
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

      it('should have the name `spacing`', () => {
        expect(SplitPanel.spacingProperty.name).to.be('spacing');
      });

      it('should default to `3`', () => {
        let panel = new SplitPanel();
        expect(SplitPanel.spacingProperty.get(panel)).to.be(3);
      });

      it('should post a `layout-request`', (done) => {
        let panel = new LogPanel();
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

      it('should have the name `stretch`', () => {
        expect(SplitPanel.stretchProperty.name).to.be('stretch');
      });

      it('should default to `0`', () => {
        let widget = new Widget();
        expect(SplitPanel.stretchProperty.get(widget)).to.be(0);
      });

      it('should post a `layout-request`', (done) => {
        let panel = new LogPanel();
        let widget = new Widget();
        panel.children.add(widget);
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
        let widget = new Widget();
        expect(SplitPanel.getStretch(widget)).to.be(0);
      });

      it('should be a pure delegate to stretchProperty', () => {
        let widget = new Widget();
        SplitPanel.stretchProperty.set(widget, 1);
        expect(SplitPanel.getStretch(widget)).to.be(1);
      });

    });

    describe('.setStretch', () => {

      it('should set the split panel stretch factor for the given widget.', () => {
        let widget = new Widget();
        SplitPanel.setStretch(widget, 1);
        expect(SplitPanel.getStretch(widget)).to.be(1);
      });

      it('should be a pure delegate to stretchProperty', () => {
        let widget = new Widget();
        SplitPanel.setStretch(widget, 1);
        expect(SplitPanel.stretchProperty.get(widget)).to.be(1);
      });

    });

    describe('#constructor()', () => {

      it('should accept no arguments', () => {
        let panel = new SplitPanel();
        expect(panel instanceof SplitPanel).to.be(true);
      });

      it('should add the `p-SplitPanel` class', () => {
        let panel = new SplitPanel();
        expect(panel.hasClass('p-SplitPanel')).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the panel', () => {
        let panel = new SplitPanel();
        panel.children.assign([new Widget(), new Widget()]);
        panel.dispose();
        expect(panel.isDisposed).to.be(true);
        expect(panel.sizes.length).to.be(0);
      });

    });

    describe('#orientation', () => {

      it('should get the orientation of the split panel', () => {
        let panel = new SplitPanel();
        expect(panel.orientation).to.be(Orientation.Horizontal);
      });

      it('should set the orientation of the split panel', () => {
        let panel = new SplitPanel();
        panel.orientation = Orientation.Vertical
        expect(panel.orientation).to.be(Orientation.Vertical);
      });

      it('should a pure delegate to the orientationProperty', () => {
        let panel = new SplitPanel();
        SplitPanel.orientationProperty.set(panel, Orientation.Vertical);
        expect(panel.orientation).to.be(Orientation.Vertical);
        panel.orientation = Orientation.Horizontal;
        let orientation = SplitPanel.orientationProperty.get(panel);
        expect(orientation).to.be(Orientation.Horizontal);
      });

    });

    describe('#spacing', () => {

      it('should get the inter-element spacing', () => {
        let panel = new SplitPanel();
        expect(panel.spacing).to.be(3);
      });

      it('should set the inter-element spacing', () => {
        let panel = new SplitPanel();
        panel.spacing = 5;
        expect(panel.spacing).to.be(5);
      });

      it('should a pure delegate to the spacingProperty', () => {
        let panel = new SplitPanel();
        SplitPanel.spacingProperty.set(panel, 2);
        expect(panel.spacing).to.be(2);
        panel.spacing = 5;
        expect(SplitPanel.spacingProperty.get(panel)).to.be(5);
      });

    });

    describe('#sizes()', () => {

      it('should get the normalized sizes of the widgets in the panel', () => {
        let panel = new SplitPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        expect(panel.sizes()).to.eql([0.5, 0.5]);
        panel.setSizes([2, 3]);
        expect(panel.sizes()).to.eql([0.4, 0.6]);
      });

    });

    describe('#setSizes()', () => {

      it('should set the relative sizes for the child widgets in the panel', () => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        Widget.attach(panel, document.body);
        panel.setSizes([1, 4]);
        expect(panel.sizes()).to.eql([0.2, 0.8]);
      });

    });

    describe('#onChildAdded()', () => {

      it('should be invoked when a child is added', () => {
        let panel = new LogPanel();
        let widget = new LogWidget();
        Widget.attach(panel, document.body);
        panel.children.assign([widget]);
        expect(panel.messages.indexOf('child-added')).to.not.be(-1);
      });

      it('should send `after-attach` to the child', () => {
        let panel = new LogPanel();
        let widget = new LogWidget();
        Widget.attach(panel, document.body);
        panel.children.assign([widget]);
        expect(widget.messages.indexOf('after-attach')).to.not.be(-1);
      });

      it('should post a `layout-request`', (done) => {
        let panel = new LogPanel();
        let widget = new LogWidget();
        Widget.attach(panel, document.body);
        expect(panel.messages.indexOf('layout-request')).to.be(-1);
        panel.children.assign([widget]);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onChildRemoved()', () => {

      it('should be invoked when a child is removed', () => {
        let panel = new LogPanel();
        let widget = new Widget();
        Widget.attach(panel, document.body);
        panel.children.assign([widget]);
        expect(panel.messages.indexOf('child-removed')).to.be(-1);
        panel.children.assign([]);
        expect(panel.messages.indexOf('child-removed')).to.not.be(-1);
      });

      it('should send `before-detach` to the child', () => {
        let panel = new LogPanel();
        let widget = new LogWidget();
        Widget.attach(panel, document.body);
        panel.children.assign([widget]);
        expect(widget.messages.indexOf('before-detach')).to.be(-1);
        panel.children.assign([]);
        expect(widget.messages.indexOf('before-detach')).to.not.be(-1);
      });

      it('should be post a `layout-request`', (done) => {
        let panel = new LogPanel();
        let widget = new Widget();
        Widget.attach(panel, document.body);
        panel.children.assign([widget]);
        clearMessageData(panel);
        panel.messages = [];
        panel.children.assign([]);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onChildMoved()', () => {

      it('should be invoked when a child is moved', () => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        Widget.attach(panel, document.body);
        panel.messages = [];
        panel.children.move(1, 0);
        expect(panel.messages.indexOf('child-moved')).to.not.be(-1);
      });

      it('should reorder the sizes appropriately', () => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        panel.setSizes([0.3, 0.7]);
        Widget.attach(panel, document.body);
        panel.messages = [];
        panel.children.move(1, 0);
        expect(panel.sizes()).to.eql([0.7, 0.3]);
      });

      it('should post a `layout-request`', (done) => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        Widget.attach(panel, document.body);
        clearMessageData(panel);
        panel.messages = [];
        panel.children.move(1, 0);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onAfterShow()', () => {

      it('should send an `update-request`', () => {
        let panel = new LogPanel();
        Widget.attach(panel, document.body);
        panel.hidden = true;
        panel.messages = [];
        panel.hidden = false;
        expect(panel.messages.indexOf('update-request')).to.not.be(-1);
      });

    });

    describe('#onAfterAttach()', () => {

      it('should post a `layout-request`', (done) => {
        let panel = new LogPanel();
        Widget.attach(panel, document.body);
        expect(panel.messages.indexOf('layout-request')).to.be(-1);
        requestAnimationFrame(() => {
          expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
          done();
        });
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should be invoked on detach', () => {
        let panel = new LogPanel();
        Widget.attach(panel, document.body);
        expect(panel.messages.indexOf('before-detach')).to.be(-1);
        Widget.detach(panel);
        expect(panel.messages.indexOf('before-detach')).to.not.be(-1);
      });

    });

    describe('#onChildShown()', () => {

      it('should post a `layout-request`', (done) => {
        let panel = new LogPanel();
        let widget = new Widget();
        widget.hidden = true;
        panel.children.assign([widget]);
        Widget.attach(panel, document.body);
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
        let panel = new LogPanel();
        let widget = new Widget();
        panel.children.assign([widget]);
        Widget.attach(panel, document.body);
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
        let panel = new LogPanel();
        let message = new ResizeMessage(100, 100);
        Widget.attach(panel, document.body);
        sendMessage(panel, message);
        expect(panel.messages.indexOf('resize')).to.not.be(-1);
      });

      it('should handle an unknown size', () => {
        let panel = new LogPanel();
        Widget.attach(panel, document.body);
        sendMessage(panel, ResizeMessage.UnknownSize);
        expect(panel.messages.indexOf('resize')).to.not.be(-1);
      });

      it('should resize the children', () => {
        let panel = new SplitPanel();
        let child0 = new Widget();
        let child1 = new Widget();
        panel.orientation = Orientation.Vertical;
        panel.children.assign([child0, child1]);
        Widget.attach(panel, document.body);
        panel.node.style.position = 'absolute';
        panel.node.style.top = '0px';
        panel.node.style.left = '0px';
        panel.node.style.width = '0px';
        panel.node.style.height = '0px';
        sendMessage(panel, Panel.MsgLayoutRequest);
        panel.node.style.width = '101px';
        panel.node.style.height = '101px';
        sendMessage(panel, new ResizeMessage(101, 101));
        expect(child0.node.offsetTop).to.be(0);
        expect(child0.node.offsetLeft).to.be(0);
        expect(child0.node.offsetWidth).to.be(101);
        expect(child0.node.offsetHeight).to.be(49);
        expect(child1.node.offsetTop).to.be(52);
        expect(child1.node.offsetLeft).to.be(0);
        expect(child1.node.offsetWidth).to.be(101);
        expect(child1.node.offsetHeight).to.be(49);
      });

    });

    describe('#onUpdate()', () => {

      it('should be invoked on an `update-request` message', () => {
        let panel = new LogPanel();
        sendMessage(panel, Widget.MsgUpdateRequest);
        expect(panel.messages.indexOf('update-request')).to.not.be(-1);
      });

      it('should resize the children', () => {
        let panel = new SplitPanel();
        let child0 = new Widget();
        let child1 = new Widget();
        panel.orientation = Orientation.Vertical;
        panel.children.assign([child0, child1]);
        Widget.attach(panel, document.body);
        panel.node.style.position = 'absolute';
        panel.node.style.top = '0px';
        panel.node.style.left = '0px';
        panel.node.style.width = '0px';
        panel.node.style.height = '0px';
        sendMessage(panel, Panel.MsgLayoutRequest);
        panel.node.style.width = '201px';
        panel.node.style.height = '201px';
        sendMessage(panel, Widget.MsgUpdateRequest);
        expect(child0.node.offsetTop).to.be(0);
        expect(child0.node.offsetLeft).to.be(0);
        expect(child0.node.offsetWidth).to.be(201);
        expect(child0.node.offsetHeight).to.be(99);
        expect(child1.node.offsetTop).to.be(102);
        expect(child1.node.offsetLeft).to.be(0);
        expect(child1.node.offsetWidth).to.be(201);
        expect(child1.node.offsetHeight).to.be(99);
      });

    });

    describe('#onLayoutRequest()', () => {

      it('should be invoked on a `layout-request` message', () => {
        let panel = new LogPanel();
        sendMessage(panel, Panel.MsgLayoutRequest);
        expect(panel.messages.indexOf('layout-request')).to.not.be(-1);
      });

      it('should send a `layout-request` to its parent', () => {
        let panel1 = new LogPanel();
        let panel2 = new LogPanel();
        panel2.parent = panel1;
        Widget.attach(panel1, document.body);
        clearMessageData(panel1);
        clearMessageData(panel2);
        expect(panel1.messages.indexOf('layout-request')).to.be(-1);
        sendMessage(panel2, Panel.MsgLayoutRequest);
        expect(panel1.messages.indexOf('layout-request')).to.not.be(-1);
      });

      it('should setup the geometry of the panel', () => {
        let panel = new SplitPanel();
        let child = new Widget();
        child.node.style.minWidth = '50px';
        child.node.style.minHeight = '50px';
        panel.children.assign([child]);
        Widget.attach(panel, document.body);
        expect(panel.node.style.minWidth).to.be('');
        expect(panel.node.style.minHeight).to.be('');
        sendMessage(panel, Panel.MsgLayoutRequest);
        expect(panel.node.style.minWidth).to.be('50px');
        expect(panel.node.style.minHeight).to.be('50px');
      });

    });

    context('mouse handling', () => {

      it('should adjust children on a handle grab and move', (done) => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          let handle = panel.node.children[1] as HTMLElement;
          let left = handle.offsetLeft;
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
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          let handle = panel.node.children[1] as HTMLElement;
          triggerMouseEvent(handle, 'mousedown', { button: 1} );
          triggerMouseEvent(handle, 'mousemove');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.be(-1);
          done();
        });
      });

      it('should handle vertical orientation', (done) => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        panel.orientation = Orientation.Vertical;
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          let handle = panel.node.children[1] as HTMLElement;
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
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        panel.orientation = Orientation.Vertical;
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          triggerMouseEvent(panel.node, 'mousedown');
          triggerMouseEvent(panel.node, 'mousemove');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.be(-1);
          done();
        });
      });

      it('should ignore a non-left click on mousemove', (done) => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        panel.orientation = Orientation.Vertical;
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          let handle = panel.node.children[1] as HTMLElement;
          let left = handle.offsetLeft;
          triggerMouseEvent(handle, 'mousedown');
          triggerMouseEvent(handle, 'mousemove', { button: 1, clientY: 10 });
          triggerMouseEvent(document.body, 'contextmenu');
          triggerMouseEvent(handle, 'mouseup');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.not.be(-1);
          expect(panel.messages.indexOf('contextmenu')).to.not.be(-1);
          expect(panel.messages.indexOf('mouseup')).to.not.be(-1);
          expect(handle.offsetLeft).to.be(left);
          done();
        });
      });

      it('should ignore a non-left click on mouseup', (done) => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        panel.orientation = Orientation.Vertical;
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          let handle = panel.node.children[1] as HTMLElement;
          let left = handle.offsetLeft;
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

      it('should ignore keyboard input on resize', (done) => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        panel.orientation = Orientation.Vertical;
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          let handle = panel.node.children[1] as HTMLElement;
          let left = handle.offsetLeft;
          triggerMouseEvent(handle, 'mousedown');
          triggerMouseEvent(handle, 'mousemove', { button: 1, clientY: 10 });
          triggerKeyboardEvent(document.body, 'keydown', { keyCode: 65 });
          triggerKeyboardEvent(document.body, 'keyup', { keyCode: 65 });
          triggerKeyboardEvent(document.body, 'keypress', { keyCode: 65 });
          triggerMouseEvent(handle, 'mouseup');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.not.be(-1);
          expect(panel.messages.indexOf('keydown')).to.not.be(-1);
          expect(panel.messages.indexOf('keyup')).to.not.be(-1);
          expect(panel.messages.indexOf('keypress')).to.not.be(-1);
          expect(panel.messages.indexOf('mouseup')).to.not.be(-1);
          expect(handle.offsetLeft).to.be(left);
          done();
        });
      });

      it('should release mouse if ESC key is pressed during resize', (done) => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        panel.orientation = Orientation.Vertical;
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          let handle = panel.node.children[1] as HTMLElement;
          let left = handle.offsetLeft;
          triggerMouseEvent(handle, 'mousedown');
          triggerMouseEvent(handle, 'mousemove', { button: 1, clientY: 10 });
          triggerKeyboardEvent(document.body, 'keydown', { keyCode: 27 });
          triggerMouseEvent(handle, 'mouseup');
          expect(panel.messages.indexOf('mousedown')).to.not.be(-1);
          expect(panel.messages.indexOf('mousemove')).to.not.be(-1);
          expect(panel.messages.indexOf('keydown')).to.not.be(-1);
          expect(panel.messages.indexOf('mouseup')).to.be(-1);
          expect(handle.offsetLeft).to.be(left);
          done();
        });
      });

      it('should be a no-op if the mouse does not move', (done) => {
        let panel = new LogPanel();
        let widget0 = new Widget();
        let widget1 = new Widget();
        panel.children.assign([widget0, widget1]);
        panel.orientation = Orientation.Vertical;
        Widget.attach(panel, document.body);
        requestAnimationFrame(() => {
          let handle = panel.node.children[1] as HTMLElement;
          let left = handle.offsetLeft;
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
        let panel = new SplitPanel();
        let child0 = new Widget();
        let child1 = new Widget();
        let child2 = new Widget();
        child2.hidden = true;
        panel.spacing = 8;
        panel.orientation = Orientation.Horizontal;
        child0.node.style.minWidth = '30px';
        child1.node.style.minHeight = '50px';
        panel.children.assign([child0, child1, child2]);
        Widget.attach(panel, document.body);
        panel.node.style.position = 'absolute';
        panel.node.style.top = '0px';
        panel.node.style.left = '0px';
        panel.node.style.width = '0px';
        panel.node.style.height = '0px';
        sendMessage(panel, Panel.MsgLayoutRequest);
        panel.node.style.width = '50px';
        panel.node.style.height = '100px';
        sendMessage(panel, new ResizeMessage(50, 100));
        expect(child0.node.offsetTop).to.be(0);
        expect(child0.node.offsetLeft).to.be(0);
        expect(child0.node.offsetWidth).to.be(36);
        expect(child0.node.offsetHeight).to.be(100);
        expect(child1.node.offsetTop).to.be(0);
        expect(child1.node.offsetLeft).to.be(44);
        expect(child1.node.offsetWidth).to.be(6);
        expect(child1.node.offsetHeight).to.be(100);
        expect(panel.node.style.minWidth).to.be('38px');
        expect(panel.node.style.minHeight).to.be('50px');
      });

      it('should handle `Vertical`', () => {
        let panel = new SplitPanel();
        let child0 = new Widget();
        let child1 = new Widget();
        let child2 = new Widget();
        child2.hidden = true;
        panel.spacing = 8;
        panel.orientation = Orientation.Vertical;
        child0.node.style.minWidth = '30px';
        child1.node.style.minHeight = '50px';
        panel.children.assign([child0, child1, child2]);
        Widget.attach(panel, document.body);
        panel.node.style.position = 'absolute';
        panel.node.style.top = '0px';
        panel.node.style.left = '0px';
        panel.node.style.width = '0px';
        panel.node.style.height = '0px';
        sendMessage(panel, Panel.MsgLayoutRequest);
        panel.node.style.width = '100px';
        panel.node.style.height = '70px';
        sendMessage(panel, new ResizeMessage(100, 70));
        expect(child0.node.offsetTop).to.be(0);
        expect(child0.node.offsetLeft).to.be(0);
        expect(child0.node.offsetWidth).to.be(100);
        expect(child0.node.offsetHeight).to.be(6);
        expect(child1.node.offsetTop).to.be(14);
        expect(child1.node.offsetLeft).to.be(0);
        expect(child1.node.offsetWidth).to.be(100);
        expect(child1.node.offsetHeight).to.be(56);
        expect(panel.node.style.minWidth).to.be('30px');
        expect(panel.node.style.minHeight).to.be('58px');
      });

    });

  });

});
