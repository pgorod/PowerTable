# Power Table Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful and flexible table card for Home Assistant that combines live data sources with editable columns and persistent storage. Perfect for task management, scheduling, inventory tracking, and any scenario requiring dynamic, user-editable tables.

## ✨ Features

- **🔄 Two Operating Modes:**
  - **Sensor Mode**: Sync with live data sources (Todoist, Calendar, custom integrations)
  - **Standalone Mode**: Pure editable table with persistent storage
  
- **📊 Rich Column Types:**
  - **Text**: Simple text input
  - **Number**: Numeric input with optional min/max/step controls
  - **Dropdown**: Select from predefined options
  - **Cycle**: Click to cycle through options
  - **Checkbox**: Boolean toggle
  - **Date**: Date picker with formatting
  - **Content**: Display-only columns from data sources

- **👥 User-Based Access Control:**
  - Table-level and column-level editability
  - Specify which Home Assistant users can edit
  - Mix editable and read-only columns

- **🎨 Customization:**
  - Custom CSS styling support
  - Markdown top/bottom content areas
  - Responsive design with mobile support
  - Configurable header visibility

- **⚡ Smart Row Management:**
  - Add rows above/below
  - Delete rows
  - Move rows up/down
  - Actions column with intuitive controls

- **💾 Persistent Storage:**
  - JSON-based storage in `/config/www/`
  - Automatic file creation on first edit
  - Command-line sensor integration

## 📦 Installation

### HACS (Recommended)

1. Open HACS in Home Assistant
2. Go to "Frontend"
3. Click the three dots menu (top right) and select "Custom repositories"
4. Add this repository URL: `https://github.com/pgorod/PowerTable`
5. Select category: "Lovelace"
6. Click "Add"
7. Find "Power Table Card" and click "Install"
8. Restart Home Assistant

### Manual Installation

1. Download `powertable-card.js` from the [latest release](https://github.com/pgorod/PowerTable/releases)
2. Copy it to `/config/www/` (create the `www` folder if it doesn't exist)
3. Add the resource to your Lovelace configuration:

```yaml
lovelace:
  mode: yaml
  resources:
    - url: /local/powertable-card.js
      type: module
```

4. Restart Home Assistant

## 🚀 Quick Start

### Standalone Mode Example

Perfect for simple editable tables without external data sources.

**1. Configure Lovelace Resource (in `configuration.yaml`):**

```yaml
lovelace:
  mode: yaml
  resources:
    - url: /local/powertable-card.js
      type: module
```

**2. Create a Command-Line Sensor:**

Add to your `configuration.yaml`:

```yaml
command_line:
  - sensor:
      name: table_storage_shopping_list
      command: 'cat /config/www/table_storage_shopping_list.json'
      value_template: "{{ now().isoformat() }}"
      json_attributes:
        - row_data
      scan_interval: 30
```

**3. Create a Shell Command for Saving:**

Add to your `configuration.yaml`:

```yaml
shell_command:
  save_table_data: "/config/save_table_data.sh '{{ table_data }}' '{{ file_path }}'"
```

**4. Create the Save Script:**

Create `/config/save_table_data.sh`:

```bash
#!/bin/bash
echo "$1" > "$2"
```

Make it executable:
```bash
chmod +x /config/save_table_data.sh
```

**5. Add the Card to Your Dashboard:**

```yaml
type: custom:powertable-card
standalone_mode: true
entity: sensor.table_storage_shopping_list
friendly_name: Shopping List
path_to_storage_json: /config/www/table_storage_shopping_list.json
editable: [john, mary]  # Replace with your HA usernames
show_header: true

columns:
  - name: Item
    type: text
  - name: Quantity
    type: number
    min: 1
    max: 99
    step: 1
  - name: Priority
    type: dropdown
    options: [Low, Medium, High]
  - name: Purchased
    type: checkbox
```

**6. Restart Home Assistant**

That's it! You now have a fully functional editable shopping list. The table will automatically create the JSON file on first edit.

---

### Sensor Mode Example

Ideal for syncing with live data sources like Todoist, Google Calendar, or custom integrations.

**1-4. Follow steps 1-4 from Standalone Mode above**

**5. Create a Data Source Sensor:**

This example uses a Todoist sensor (requires Todoist integration):

```yaml
command_line:
  - sensor:
      name: table_storage_todoist
      command: 'cat /config/www/table_storage_todoist.json'
      value_template: "{{ now().isoformat() }}"
      json_attributes:
        - row_data
      scan_interval: 30
```

**6. Add the Card with Data Source Configuration:**

```yaml
type: custom:powertable-card
entity: sensor.table_storage_todoist
friendly_name: My Todoist Tasks
show_header: true
path_to_storage_json: /config/www/table_storage_todoist.json
editable: [john, mary]  # Users who can edit
if_missing: hide  # What to do with rows missing from source

data_source:
  type: sensor_attribute
  entity_id: sensor.all_todoist_items  # Your Todoist sensor
  attribute_path: items
  primary_key: id  # Field to match rows

columns:
  # Hidden column for matching (not displayed)
  - name: ID
    type: content
    source: id
    hidden: true
    
  # Read-only columns from data source
  - name: Task
    type: content
    source: content
    
  - name: Due
    type: content
    source: due_date
    
  # Editable columns (inherit table-level permissions)
  - name: My Notes
    type: text
    
  - name: Priority
    type: dropdown
    options: [Low, Medium, High]
    editable: [john]  # Override: only john can edit
    
  - name: Status
    type: cycle
    options: [Not Started, In Progress, Done]
    
  - name: Hours Spent
    type: number
    min: 0
    max: 24
    step: 0.5
```

**7. Restart Home Assistant**

This creates a hybrid table: live task data from Todoist with your own editable columns for notes, priorities, and tracking!

## 📖 Configuration

### Card Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | string | **Required** | `custom:powertable-card` |
| `entity` | string | **Required** | Sensor entity containing table storage |
| `standalone_mode` | boolean | `false` | Enable standalone mode (no data source) |
| `friendly_name` | string | - | Display name for the table |
| `path_to_storage_json` | string | **Required** | Path to JSON storage file (e.g., `/config/www/table.json`) |
| `show_header` | boolean | `true` | Show table header row |
| `editable` | array/boolean | `true` | Users allowed to edit. `true` = all users, `false` = none, `[user1, user2]` = specific users |
| `if_missing` | string | `show` | Behavior for rows missing from data source: `remove`, `hide`, `disable`, `show` |
| `fit_width` | boolean | `false` | Make table fit container width |
| `accent` | string | - | Accent color for styling |
| `style` | string | - | Custom CSS styles |
| `markdown_top_content` | string | - | Markdown content above table (supports templates) |
| `markdown_bottom_content` | string | - | Markdown content below table (supports templates) |
| `columns` | array | **Required** | Column definitions (see below) |

### Data Source Configuration (Sensor Mode Only)

```yaml
data_source:
  type: sensor_attribute
  entity_id: sensor.your_data_source
  attribute_path: items  # Path to array in sensor attributes
  primary_key: id  # Field used to match rows
```

### Column Types

#### Text Column
```yaml
- name: Notes
  type: text
  editable: [user1, user2]  # Optional: override table-level
```

#### Text Column with Split
```yaml
- name: Address
  type: text
  split: ","  # Splits "123 Main St,Apt 4B" into two lines
  # Useful for displaying multi-part data like addresses, codes, or timestamps
```

#### Number Column
```yaml
- name: Quantity
  type: number
  min: 0
  max: 100
  step: 1
  editable: true
```

#### Dropdown Column
```yaml
- name: Status
  type: dropdown
  options: [Todo, In Progress, Done]
  editable: [john]
```

#### Cycle Column
```yaml
- name: Priority
  type: cycle
  options: [Low, Medium, High]
```

#### Checkbox Column
```yaml
- name: Completed
  type: checkbox
```

#### Date Column
```yaml
- name: Due Date
  type: date
  format: "yyyy-mm-dd"  # Optional: custom format
```

#### Content Column (Sensor Mode)
```yaml
- name: Task Name
  type: content
  source: content  # Field name from data source
  hidden: false  # Optional: hide column but keep for matching
```

### Column Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | **Required** | Column header text |
| `type` | string | **Required** | Column type: `text`, `number`, `dropdown`, `cycle`, `checkbox`, `date`, `content` |
| `editable` | array/boolean | Inherit | Override table-level editability for this column |
| `hidden` | boolean | `false` | Hide column (useful for ID columns) |
| `min_width` | string | - | Minimum column width (e.g., `"150px"` or `"20%"`) |
| `source` | string | - | Data source field (for `content` type) |
| `options` | array | - | Available options (for `dropdown`/`cycle` types) |
| `min` | number | - | Minimum value (for `number` type) |
| `max` | number | - | Maximum value (for `number` type) |
| `step` | number | - | Increment step (for `number` type) |
| `format` | string | `"yyyy-mm-dd"` | Date format (for `date` type) |
| `split` | string | - | Character to split on for multi-line display (for `text`/`content` types) |

## 🎨 Styling

### Custom CSS

Use the `style` property to add custom CSS:

```yaml
type: custom:powertable-card
entity: sensor.table_storage_tasks
style: |
  .power-table th { 
    color: white !important; 
    background: linear-gradient(to right, #667eea, #764ba2) !important; 
  }
  .readonly-cell { 
    background: #f0f0f0 !important;
    font-style: italic;
  }
  .actions-cell { 
    background: #e3f2fd !important; 
  }
```

### Markdown Content with Templates

Add context above/below your table using Home Assistant templates:

```yaml
markdown_top_content: |
  **Weekly Schedule**
  
  👤 Editing as: **{{ user }}** | 📅 {{ states('sensor.date') }}
  
  *Click cells to edit. Long press for advanced actions.*

markdown_bottom_content: |
  Last updated: {{ now().strftime('%Y-%m-%d %H:%M') }}
  
  📧 Questions? Contact: admin@example.com
```

## 🔧 Advanced Examples

### Team Task Board with Assignments

```yaml
type: custom:powertable-card
standalone_mode: true
entity: sensor.table_storage_tasks
friendly_name: Team Task Board
path_to_storage_json: /config/www/table_storage_tasks.json
editable: [manager, team_lead]
show_header: true
accent: '#4CAF50'

markdown_top_content: |
  **Sprint Tasks** | Editing as: **{{ user }}**
  
  🎯 Focus: Complete all High priority items this week

columns:
  - name: Task
    type: text
    min_width: "200px"
  - name: Assigned To
    type: dropdown
    options: [John, Mary, Alex, Sarah, Mike, '']
  - name: Priority
    type: cycle
    options: [Low, Medium, High, Urgent]
  - name: Status
    type: dropdown
    options: [Backlog, In Progress, Review, Done]
  - name: Hours
    type: number
    min: 0
    max: 40
    step: 0.5
  - name: Due Date
    type: date
  - name: Completed
    type: checkbox
    editable: true  # Everyone can mark complete
```

### Inventory Tracker

```yaml
type: custom:powertable-card
standalone_mode: true
entity: sensor.table_storage_inventory
friendly_name: Office Inventory
path_to_storage_json: /config/www/table_storage_inventory.json
editable: [admin, office_manager]
fit_width: true

style: |
  .power-table {
    font-size: 13px;
  }
  .power-table td {
    padding: 6px;
  }

columns:
  - name: Item
    type: text
    min_width: "150px"
  - name: Category
    type: dropdown
    options: [Electronics, Furniture, Supplies, Other]
  - name: Quantity
    type: number
    min: 0
    max: 999
  - name: Low Stock
    type: checkbox
  - name: Last Ordered
    type: date
  - name: Supplier
    type: text
  - name: Notes
    type: text
    min_width: "200px"
```

### Hybrid Todoist + Custom Columns

```yaml
type: custom:powertable-card
entity: sensor.table_storage_todoist
friendly_name: Enhanced Todoist View
path_to_storage_json: /config/www/table_storage_todoist.json
editable: [john, mary]
if_missing: hide  # Hide completed/deleted tasks
show_header: true

data_source:
  type: sensor_attribute
  entity_id: sensor.all_todoist_items
  attribute_path: items
  primary_key: id

markdown_top_content: |
  **My Enhanced Tasks** ({{ user }})
  
  Data synced from Todoist with custom tracking columns

columns:
  # From Todoist (read-only)
  - name: ID
    type: content
    source: id
    hidden: true
  - name: Task
    type: content
    source: content
    min_width: "200px"
  - name: Project
    type: content
    source: project_name
  - name: Due
    type: content
    source: due_date
  
  # Custom editable columns
  - name: My Priority
    type: cycle
    options: [P4, P3, P2, P1]
  - name: Time Estimate
    type: number
    min: 0.25
    max: 8
    step: 0.25
  - name: Progress
    type: dropdown
    options: [Not Started, Started, Blocked, Almost Done]
  - name: My Notes
    type: text
    min_width: "200px"
  - name: Reviewed
    type: checkbox
```

## 🐛 Troubleshooting

### Table doesn't appear
- Ensure the sensor entity exists and is not `unavailable`
- Check browser console for errors
- Verify the resource is properly loaded in Lovelace

### Changes not persisting
- Verify `/config/save_table_data.sh` exists and is executable
- Check `shell_command` is properly configured
- Ensure `/config/www/` directory has write permissions
- Check Home Assistant logs for errors

### "Unavailable" sensor
- Ensure the JSON file path is correct
- Verify command-line sensor is properly configured
- Restart Home Assistant after configuration changes

### Permission issues
- Check that usernames in `editable` match your Home Assistant users
- Username comparison is case-sensitive
- Use Developer Tools → States to verify current user

### Data source not syncing
- Verify `data_source.entity_id` exists
- Check `attribute_path` matches your sensor's structure
- Ensure `primary_key` field exists in source data
- Set appropriate `if_missing` behavior

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by various Home Assistant table cards
- Built with [Lit Element](https://lit.dev/)
- Uses [marked](https://marked.js.org/) for Markdown rendering
- Date formatting by [Steven Levithan](https://blog.stevenlevithan.com/archives/javascript-date-format)

## 📮 Support

- 🐛 [Report bugs](https://github.com/pgorod/PowerTable/issues)
- 💡 [Request features](https://github.com/pgorod/PowerTable/issues)
- 💬 [Community forum](https://community.home-assistant.io/)

---

**Made with ❤️ for the Home Assistant community**
