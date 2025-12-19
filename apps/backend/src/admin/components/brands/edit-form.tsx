import z from "zod";
import { Controller, FormProvider, useForm } from "react-hook-form";
import {
  Button,
  Drawer,
  Heading,
  Input,
  Label,
  toast,
  Tooltip,
} from "@medusajs/ui";
import { useNavigate } from "react-router-dom";
import { InformationCircleSolid } from "@medusajs/icons";
import { useState } from "react";
import { HandleInput } from "../handle-input";
import { useUpdateBrand } from "../../hooks/brands";

interface EditFormProps {
  id: string;
  name: string;
  handle: string;
  editOpen: boolean;
  showEdit: () => void;
  closeEdit: () => void;
}
const schema = z.object({
  name: z.string(),
  handle: z.string(),
});

export const EditForm = (props: EditFormProps) => {
  const { id, name, handle, editOpen, showEdit, closeEdit } = props;
  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      name: name,
      handle: handle,
    },
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { mutateAsync: onUpdateBrand } = useUpdateBrand(id);
  const handleSubmit = form.handleSubmit(async ({ name, handle }) => {
    try {
      setLoading(true);
      const newHandle = handle ? handle.toLowerCase() : name.toLowerCase();
      await onUpdateBrand({ name, handle: newHandle });
      toast.success("", {
        description: `Brand ${name} was successfully updated.`,
      });
      navigate(`/brands/${id}`);
    } catch (error) {
      toast.error("", { description: "Update brand failed!" });
    } finally {
      setLoading(false);
      closeEdit();
    }
  });

  return (
    <Drawer
      open={editOpen}
      onOpenChange={(modalOpened) => {
        if (!modalOpened) {
          closeEdit();
        }
      }}
    >
      <Drawer.Content>
        <FormProvider {...form}>
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <Drawer.Header>
              <Heading className="capitalize">Edit Brand</Heading>
            </Drawer.Header>
            <Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
              <Controller
                control={form.control}
                name="name"
                render={({ field }) => {
                  return (
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-x-1">
                        <Label size="small" weight="plus">
                          Name
                        </Label>
                      </div>
                      <Input {...field} />
                    </div>
                  );
                }}
              />
              <Controller
                control={form.control}
                name="handle"
                render={({ field }) => {
                  return (
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center gap-x-1">
                        <Label htmlFor="hanlde">Handle</Label>
                        <Label>
                          <Tooltip content="The handle is used to reference the brand in your storefront. If not specified, the handle will be generated from the brand name.">
                            <InformationCircleSolid />
                          </Tooltip>
                        </Label>
                        <Label>(Optional)</Label>
                      </div>
                      <HandleInput {...field} />
                    </div>
                  );
                }}
              />
            </Drawer.Body>
            <Drawer.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <Drawer.Close asChild>
                  <Button size="small" variant="secondary">
                    Cancel
                  </Button>
                </Drawer.Close>
                <Button size="small" type="submit" isLoading={loading}>
                  Save
                </Button>
              </div>
            </Drawer.Footer>
          </form>
        </FormProvider>
      </Drawer.Content>
    </Drawer>
  );
};
