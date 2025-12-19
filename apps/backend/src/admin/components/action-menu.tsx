import { DropdownMenu, IconButton, clx, toast, usePrompt } from "@medusajs/ui";
import { EllipsisHorizontal } from "@medusajs/icons";
import { Link } from "react-router-dom";
import { useRemoveProducts } from "../hooks/brands";

export type PromptParam = {
  title: string;
  description: string;
};
export type ConfirmedParam = {
  brand_id: string;
  products: string[];
};
export type Action = {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  prompt?: boolean;
  promptParam?: PromptParam;
  confirmedParam?: ConfirmedParam;
} & (
  | {
      to: string;
      onClick?: never;
    }
  | {
      onClick: () => void;
      to?: never;
    }
);

export type ActionGroup = {
  actions: Action[];
};

export type ActionMenuProps = {
  groups: ActionGroup[];
};

export const ActionMenu = ({ groups }: ActionMenuProps) => {
  const dialog = usePrompt();

  let brand_id = "";
  groups.forEach((group) => {
    group.actions.forEach((action) => {
      if (action.onClick && action.prompt && action.confirmedParam)
        brand_id = action.confirmedParam.brand_id;
    });
  });
  const { mutateAsync: removeProducts } = useRemoveProducts(brand_id);

  const onRemoveProduct = async ({ products }: { products: string[] }) => {
    try {
      await removeProducts({
        products,
      });
      toast.success("", {
        description: "Product was successfully removed from the brand.",
      });
    } catch (e) {
      toast.error("", { description: "Remove product failed!" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton size="small" variant="transparent">
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {groups.map((group, index) => {
          if (!group.actions.length) {
            return null;
          }

          const isLast = index === groups.length - 1;

          return (
            <DropdownMenu.Group key={index}>
              {group.actions.map((action, index) => {
                if (action.onClick) {
                  return (
                    <DropdownMenu.Item
                      disabled={action.disabled}
                      key={index}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (action.prompt) {
                          const promptParam = action.promptParam;
                          const userHasConfirmed = await dialog({
                            title: promptParam?.title || "",
                            description: promptParam?.description || "",
                          });
                          if (userHasConfirmed) {
                            const { products } = action.confirmedParam!;
                            onRemoveProduct({ products });
                          }
                        } else {
                          action.onClick();
                        }
                      }}
                      className={clx(
                        "[&_svg]:text-ui-fg-subtle flex items-center gap-x-2",
                        {
                          "[&_svg]:text-ui-fg-disabled": action.disabled,
                        }
                      )}
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </DropdownMenu.Item>
                  );
                }

                return (
                  <div key={index}>
                    <DropdownMenu.Item
                      className={clx(
                        "[&_svg]:text-ui-fg-subtle flex items-center gap-x-2",
                        {
                          "[&_svg]:text-ui-fg-disabled": action.disabled,
                        }
                      )}
                      asChild
                      disabled={action.disabled}
                    >
                      <Link to={action.to} onClick={(e) => e.stopPropagation()}>
                        {action.icon}
                        <span>{action.label}</span>
                      </Link>
                    </DropdownMenu.Item>
                  </div>
                );
              })}
              {!isLast && <DropdownMenu.Separator />}
            </DropdownMenu.Group>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
