import { OpencodeGoModel } from "#types/opencode";

export const parseModel = (model: OpencodeGoModel) => {
    const [providerID, id] = model.split('/')
    return {
        id,
        providerID
    }
}