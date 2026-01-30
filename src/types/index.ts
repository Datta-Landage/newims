import { IUser } from '../models';

export type Variables = {
    user: IUser & { roleCode?: string };
    tenantId: string;
    branchId: string;
};

export type Bindings = {
    // Environment variables binding for Cloudflare Workers etc, but we are using Bun/Node
}
