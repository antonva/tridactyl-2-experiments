import * as m from "mithril"
import {ContentAttrs} from '~/content'

const TriInput: m.Component<ContentAttrs> = {
    view: (vnode) => {
        const {model, actions} = vnode.attrs
        return m("div", {id: "command-line-holder"}, [
            m("span", {id: "tridactyl-colon"}),
            m("input", {
                id: "tridactyl-input",
                type: "text",
                oninput: (e: any) => actions.uiframe.oninput(e.target.value),
                value: model.uiframe.commandline.text
            })
        ]);
    }
};

export default TriInput
