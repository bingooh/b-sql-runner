import {QueryInterface, WhereExists, WhereNull,HavingIn} from "knex";

declare module "knex"{
    interface QueryInterface {
        havingNull:WhereNull;
        havingNotNull:WhereNull;
        havingExists:WhereExists;
        havingNotExists:WhereExists;
        havingNotIn:HavingIn;
    }
}
