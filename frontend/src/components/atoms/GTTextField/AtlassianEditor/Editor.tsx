import { Editor as AtlaskitEditor, EditorActions } from '@atlaskit/editor-core'
import { JSONTransformer } from '@atlaskit/editor-json-transformer'
import { MarkdownTransformer } from '@atlaskit/editor-markdown-transformer'
import adf2md from 'adf-to-md'
import styled from 'styled-components'
import { Spacing } from '../../../../styles'
import { TOOLBAR_HEIGHT } from '../toolbar/styles'
import { RichTextEditorProps } from '../types'

const serializer = new JSONTransformer()

const EditorContainer = styled.div`
    height: 100%;
    :focus-within {
        height: calc(100% - ${TOOLBAR_HEIGHT});
    }
    box-sizing: border-box;
    /* height: 100%s needed to make editor match container height so entire area is clickable */
    > div > :nth-child(2) {
        height: 100%;
        > div {
            height: 100%;
        }
    }
    .ak-editor-content-area {
        height: 100%;
    }
    && .ProseMirror {
        height: 100%;
        padding: ${Spacing._8};
        box-sizing: border-box;
        > * {
            padding-bottom: ${Spacing._8};
            margin: 0;
        }
        > .code-block {
            margin: 0;
        }
    }
    .assistive {
        display: none;
    }
`

interface EditorProps extends RichTextEditorProps {
    editorActions: EditorActions
}

const Editor = ({
    type,
    value,
    placeholder,
    disabled,
    autoFocus,
    enterBehavior,
    onChange,
    editorActions,
}: EditorProps) => {
    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
        if (e.key === 'Escape' || (enterBehavior === 'blur' && e.key === 'Enter')) {
            editorActions.blur()
        }
    }

    return (
        <EditorContainer onKeyDown={handleKeyDown}>
            <AtlaskitEditor
                defaultValue={value}
                placeholder={placeholder}
                disabled={disabled}
                shouldFocus={autoFocus}
                appearance="chromeless"
                onChange={(e) => {
                    const json = serializer.encode(e.state.doc)
                    if (type === 'markdown') {
                        onChange(adf2md.convert(json).result)
                    } else {
                        onChange(JSON.stringify(json))
                    }
                }}
                contentTransformerProvider={
                    type === 'markdown' ? (schema) => new MarkdownTransformer(schema) : undefined
                }
            />
        </EditorContainer>
    )
}

export default Editor