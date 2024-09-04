import { StackContext, Api } from "sst/constructs";

export function API({ stack }: StackContext) {
  const api = new Api(stack, "api");

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
