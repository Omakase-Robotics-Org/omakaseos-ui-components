/**
 * @file Storybook stories for the Table skin family.
 *
 * One story file covers all six components (TableSurface / Table /
 * TableHeaderCell / TableRow / TableCell / TableNotice) — they are one
 * skin ported as one unit (see Table.tsx's file header), not six
 * independently-demoed primitives. TableSurface / TableHeaderCell /
 * TableRow / TableCell / TableNotice are ratcheted in
 * spec/storybook-coverage.spec.ts's RATCHETED_EXPORTS_WITHOUT_OWN_STORY
 * accordingly.
 */
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Table,
  TableCell,
  TableHeaderCell,
  TableNotice,
  TableRow,
  TableSurface,
} from "./Table";
import type { TableSortDirection } from "./Table";
import { EmptyNote } from "./EmptyNote";

type Robot = { id: string; name: string; site: string; battery: number };

const ROBOTS: readonly Robot[] = [
  { id: "g1-001", name: "G1-001", site: "Fremont DC1", battery: 92 },
  { id: "g1-002", name: "G1-002", site: "Fremont DC1", battery: 41 },
  { id: "g1-003", name: "G1-003", site: "Reno DC2", battery: 76 },
  { id: "g1-004", name: "G1-004", site: "Reno DC2", battery: 8 },
  { id: "g1-005", name: "G1-005", site: "Fremont DC1", battery: 63 },
];

/** A plain, non-sortable, non-clickable table — the baseline shape. */
function BasicRobotsTable(props: { density?: "comfortable" | "compact" }) {
  return (
    <TableSurface>
      <Table density={props.density}>
        <thead>
          <tr>
            <TableHeaderCell>Robot</TableHeaderCell>
            <TableHeaderCell>Site</TableHeaderCell>
            <TableHeaderCell align="end">Battery</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {ROBOTS.map((robot) => (
            <TableRow key={robot.id}>
              <TableCell>{robot.name}</TableCell>
              <TableCell>{robot.site}</TableCell>
              <TableCell align="end">{robot.battery}%</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </TableSurface>
  );
}

/** Sortable "Battery" column, non-sortable "Robot"/"Site" columns side by side. */
function SortableRobotsTable() {
  const [direction, setDirection] = useState<TableSortDirection>(null);
  const sorted = [...ROBOTS].sort((a, b) => {
    if (direction === null) {
      return 0;
    }
    const delta = a.battery - b.battery;
    return direction === "asc" ? delta : -delta;
  });
  return (
    <TableSurface>
      <Table>
        <thead>
          <tr>
            <TableHeaderCell>Robot</TableHeaderCell>
            <TableHeaderCell>Site</TableHeaderCell>
            <TableHeaderCell
              align="end"
              sort={{
                direction,
                onSort: () =>
                  setDirection((prev) => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc")),
              }}
            >
              Battery
            </TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {sorted.map((robot) => (
            <TableRow key={robot.id}>
              <TableCell>{robot.name}</TableCell>
              <TableCell>{robot.site}</TableCell>
              <TableCell align="end">{robot.battery}%</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </TableSurface>
  );
}

function ClickableRobotsTable() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <TableSurface>
      <Table>
        <thead>
          <tr>
            <TableHeaderCell>Robot</TableHeaderCell>
            <TableHeaderCell>Site</TableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {ROBOTS.map((robot) => (
            <TableRow key={robot.id} clickable onClick={() => setSelected(robot.id)}>
              <TableCell>{robot.name}</TableCell>
              <TableCell>{robot.site}</TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>
      {selected === null ? null : (
        <p style={{ margin: "8px 0 0", fontSize: 13 }}>Selected: {selected}</p>
      )}
    </TableSurface>
  );
}

const meta = {
  title: "Table/Table",
  component: Table,
  tags: ["autodocs"],
  args: { children: null },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Comfortable: Story = {
  render: () => <BasicRobotsTable density="comfortable" />,
};

export const Compact: Story = {
  render: () => <BasicRobotsTable density="compact" />,
};

/** A sortable numeric column next to two non-sortable ones — the span-vs-button rule. */
export const SortableAndNonSortableHeaders: Story = {
  render: () => <SortableRobotsTable />,
};

export const ClickableRows: Story = {
  render: () => <ClickableRobotsTable />,
};

/** The overflow-notice strip look, rendered above the table. */
export const WithNoticeStrip: Story = {
  render: () => (
    <div>
      <TableNotice>Showing 5 of 4,201 robots — narrow the filter to see the rest.</TableNotice>
      <BasicRobotsTable />
    </div>
  ),
};

/** EmptyNote is the empty-state content; `padded` is its frame (see Table.tsx's dedup note). */
export const EmptyState: Story = {
  render: () => (
    <TableSurface padded>
      <EmptyNote label="No robots match the current filter." />
    </TableSurface>
  ),
};
