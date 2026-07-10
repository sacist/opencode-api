import { type OpencodeGoModel, OPENCODE_GO_PROVIDER_ID } from "#types/opencode";


export const parseModel = (model: OpencodeGoModel) => ({
    id: model,
    providerID: OPENCODE_GO_PROVIDER_ID,
})
