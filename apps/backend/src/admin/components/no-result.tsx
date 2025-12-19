import { MagnifyingGlass } from "@medusajs/icons";
import { clx, Text } from "@medusajs/ui";

const NoResultsFound = () => {
  return (
    <div className={clx("flex flex-col items-center justify-center gap-3")}>
      <MagnifyingGlass />
      <Text className={clx("text-base font-medium text-black dark:text-white")}>
        No results
      </Text>
      <Text className={clx("text-gray-500 dark:text-gray-400")}>
        Try changing the filters or search query
      </Text>
    </div>
  );
};

export default NoResultsFound;
