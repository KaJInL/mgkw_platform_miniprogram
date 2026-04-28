import type { IBaseResponse } from "@/common/apis/base/res";
import { http } from "@/plugin/request";

export interface ILegalDocumentsRes {
  user_agreement: string;
  privacy_policy: string;
}

const legalDocumentApi = {
  getLegalDocuments() {
    return http.get<ILegalDocumentsRes>("/legal-documents") as Promise<IBaseResponse<ILegalDocumentsRes>>;
  },
};

export default legalDocumentApi;
