import {
  Kind,
  OperationDefinitionNode,
  SelectionSetNode,
  parse,
} from "graphql";

export interface GraphqlRequestAnalysis {
  isMutation: boolean;
  mutationFieldCounts: Record<string, number>;
  topLevelMutationFieldCount: number;
}

function collectTopLevelFields(
  selectionSet: SelectionSetNode,
  fragments: Map<string, SelectionSetNode>,
  fieldsByResponseName: Map<string, string>,
  fragmentStack: Set<string>
): void {
  for (const selection of selectionSet.selections) {
    if (selection.kind === Kind.FIELD) {
      const responseName = selection.alias?.value ?? selection.name.value;
      fieldsByResponseName.set(responseName, selection.name.value);
      continue;
    }

    if (selection.kind === Kind.INLINE_FRAGMENT) {
      collectTopLevelFields(
        selection.selectionSet,
        fragments,
        fieldsByResponseName,
        fragmentStack
      );
      continue;
    }

    const fragmentName = selection.name.value;
    if (fragmentStack.has(fragmentName)) continue;

    const fragmentSelectionSet = fragments.get(fragmentName);
    if (!fragmentSelectionSet) continue;

    fragmentStack.add(fragmentName);
    collectTopLevelFields(
      fragmentSelectionSet,
      fragments,
      fieldsByResponseName,
      fragmentStack
    );
    fragmentStack.delete(fragmentName);
  }
}

function selectOperations(
  operations: OperationDefinitionNode[],
  operationName: unknown
): OperationDefinitionNode[] {
  if (typeof operationName === "string" && operationName.trim()) {
    return operations.filter(
      (operation) => operation.name?.value === operationName
    );
  }

  if (operations.length === 1) return operations;

  // Apollo rejects multi-operation documents without operationName. Treat all
  // mutations conservatively until that validation occurs.
  return operations.filter((operation) => operation.operation === "mutation");
}

export function analyzeGraphqlRequest(
  query: unknown,
  operationName?: unknown
): GraphqlRequestAnalysis {
  const empty: GraphqlRequestAnalysis = {
    isMutation: false,
    mutationFieldCounts: {},
    topLevelMutationFieldCount: 0,
  };

  if (typeof query !== "string" || !query.trim()) return empty;

  try {
    const document = parse(query);
    const fragments = new Map<string, SelectionSetNode>();
    const operations: OperationDefinitionNode[] = [];

    for (const definition of document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        fragments.set(definition.name.value, definition.selectionSet);
      } else if (definition.kind === Kind.OPERATION_DEFINITION) {
        operations.push(definition);
      }
    }

    const fieldsByResponseName = new Map<string, string>();
    let isMutation = false;

    for (const operation of selectOperations(operations, operationName)) {
      if (operation.operation !== "mutation") continue;
      isMutation = true;
      collectTopLevelFields(
        operation.selectionSet,
        fragments,
        fieldsByResponseName,
        new Set()
      );
    }

    const mutationFieldCounts: Record<string, number> = {};
    for (const fieldName of fieldsByResponseName.values()) {
      mutationFieldCounts[fieldName] =
        (mutationFieldCounts[fieldName] ?? 0) + 1;
    }

    return {
      isMutation,
      mutationFieldCounts,
      topLevelMutationFieldCount: fieldsByResponseName.size,
    };
  } catch {
    return empty;
  }
}
