import * as saml2 from 'saml2-js';
import * as sharedQueries from '../shared-queries';
import { Institution } from '../models/institution';

export const getIdp = async (institutionId: number) => {
    const institution: Institution = await sharedQueries.getDeprecatedEventById({ institutionId }) as Institution;

    const idp_options: any = {
        certificates: [institution.ssoSamlCertFilename],
        force_authn: true,
        sign_get_request: false,
        allow_unencrypted_assertion: true,
        sso_login_url: institution.ssoLoginUrl,
        sso_logout_url: institution.ssoLogoutUrl,
    };

    return new saml2.IdentityProvider(idp_options);
};

export const getSp = async (institutionId: number) => {
    const institution: Institution = await sharedQueries.getDeprecatedEventById({ institutionId }) as Institution;

    const sp_options: any = {
        nameid_format: institution.ssoNameIdFormat,
        private_key: process.env.SAML_SP_PRIVATE_KEY,
        certificate: process.env.SAML_SP_CERT,
        notbefore_skew: 200,
        entity_id: `${process.env.API_URL}/authentication/${institution.ssoInstitutionCode}/metadata.xml`,
        assert_endpoint: `${process.env.API_URL}/authentication/${institution.ssoInstitutionCode}/assert`,
        logout_endpoint: `${process.env.API_URL}/authentication/${institution.ssoInstitutionCode}/assert-logout`,
    };

    return new saml2.ServiceProvider(sp_options);
};
