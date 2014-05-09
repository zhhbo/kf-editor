/*!
 * 输入控制组件
 */

define( function ( require, exports, module ) {

    var kity = require( "kity" ),
        kfUtils = require( "base/utils" ),
        InputFilter = require( "control/input-filter" ),
        KEY_CODE = {
            LEFT: 37,
            RIGHT: 39,
            DELETE: 8
        };

    return kity.createClass( "InputComponent", {

        constructor: function ( parentComponent, kfEditor ) {

            this.parentComponent = parentComponent;
            this.kfEditor = kfEditor;

            this.inputBox = this.createInputBox();

            this.initServices();

            this.initEvent();

        },

        initServices: function () {

            this.kfEditor.registerService( "control.update.input", this, {
                updateInput: this.updateInput
            } );

            this.kfEditor.registerService( "control.insert.string", this, {
                insertStr: this.insertStr
            } );

        },

        createInputBox: function () {

            var editorContainer = this.kfEditor.getContainer(),
                box = this.kfEditor.getDocument().createElement( "input" );

            box.className = "kf-editor-input-box";
            box.type = "text";

            // focus是否可信
            box.isTrusted = false;

            editorContainer.appendChild( box );

            return box;

        },

        setUntrusted: function () {
            this.inputBox.isTrusted = false;
        },

        setTrusted: function () {
            this.inputBox.isTrusted = true;
        },

        updateInput: function () {

            var latexInfo = this.kfEditor.requestService( "syntax.serialization" );

            this.setUntrusted();
            this.inputBox.value = latexInfo.str;
            this.inputBox.selectionStart = latexInfo.startOffset;
            this.inputBox.selectionEnd = latexInfo.endOffset;
            this.inputBox.focus();
            this.setTrusted();

        },

        insertStr: function ( str ) {

            var latexInfo = this.kfEditor.requestService( "syntax.serialization" ),
                originString = latexInfo.str;

            // 拼接latex字符串
            originString = originString.substring( 0, latexInfo.startOffset ) + " " + str + " " + originString.substring( latexInfo.endOffset );

            this.restruct( originString );
            this.updateInput();

        },

        initEvent: function () {

            var _self = this;

            kfUtils.addEvent( this.inputBox, "keydown", function ( e ) {

                if ( e.ctrlKey ) {
                    // 处理用户控制行为
                    _self.processUserCtrl( e );
                    return;
                }

                switch ( e.keyCode ) {

                    case KEY_CODE.LEFT:
                        e.preventDefault();
                        _self.leftMove();
                        break;

                    case KEY_CODE.RIGHT:
                        e.preventDefault();
                        _self.rightMove();
                        break;

                    case KEY_CODE.DELETE:
                        e.preventDefault();
                        _self.delete();
                        break;

                }

                if ( !_self.pretreatmentInput( e ) ) {
                    e.preventDefault();
                }

            } );

            // 用户输入
            kfUtils.addEvent( this.inputBox, "input", function ( e ) {

                _self.processingInput();

            } );

            // 光标显隐控制
            kfUtils.addEvent( this.inputBox, "blur", function ( e ) {

                _self.kfEditor.requestService( "ui.toolbar.disable" );
                _self.kfEditor.requestService( "ui.toolbar.close" );

                _self.kfEditor.requestService( "control.cursor.hide" );
                _self.kfEditor.requestService( "render.clear.select" );

            } );

            kfUtils.addEvent( this.inputBox, "focus", function ( e ) {

                _self.kfEditor.requestService( "ui.toolbar.enable" );

                if ( this.isTrusted ) {
                    _self.kfEditor.requestService( "control.reselect" );
                }

            } );

            // 粘贴过滤
            kfUtils.addEvent( this.inputBox, "paste", function ( e ) {

                e.preventDefault();

            } );

        },

        hasRootplaceholder: function () {
            return this.kfEditor.requestService( "syntax.has.root.placeholder" );
        },

        leftMove: function () {

            // 当前处于"根占位符"上， 则不允许move
            if ( this.hasRootplaceholder() ) {
                return;
            }

            this.kfEditor.requestService( "syntax.cursor.move.left" );
            this.update();

        },

        rightMove: function () {

            if ( this.hasRootplaceholder() ) {
                return;
            }

            this.kfEditor.requestService( "syntax.cursor.move.right" );
            this.update();

        },

        delete: function () {

            var isNeedRedraw = null;

            // 当前处于"根占位符"上，不允许删除操作
            if ( this.hasRootplaceholder() ) {
                return;
            }

            // 返回是否修要重绘
            isNeedRedraw = this.kfEditor.requestService( "syntax.delete.group" );

            if ( isNeedRedraw ) {
                this.updateInput();
                this.processingInput();
            } else {
                this.updateInput();
                this.kfEditor.requestService( "control.reselect" );
            }

        },

        processUserCtrl: function ( e ) {

            e.preventDefault();

            switch ( e.keyCode ) {

                // ctrl + A
                case 65:
                    this.kfEditor.requestService( "control.select.all" );
                    break;

                // ctrl + S
                case 83:
                    this.kfEditor.requestService( "print.image" );
                    break;

            }

        },

        // 输入前的预处理， 执行输入过滤
        pretreatmentInput: function ( evt ) {

            var keyCode = this.getKeyCode( evt ),
                replaceStr = InputFilter.getReplaceString( keyCode );

            if ( replaceStr === null ) {
                return true;
            }

            this.insertStr( replaceStr );
            return false;

        },

        getKeyCode: function ( e ) {
            return ( e.shiftKey ? "s+" : "" ) + e.keyCode;
        },

        processingInput: function () {

            this.restruct( this.inputBox.value );

        },

        // 根据给定的字符串重新进行构造公式
        restruct: function ( latexStr ) {

            this.kfEditor.requestService( "render.draw", latexStr );
            this.kfEditor.requestService( "control.reselect" );

        },

        update: function () {

            // 更新输入框
            this.updateInput();
            this.kfEditor.requestService( "control.reselect" );

        }

    } );

} );