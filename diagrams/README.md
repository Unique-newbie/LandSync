# System Diagrams

All diagrams are in SVG format for scalability and quality.

## Diagram Index

| Diagram | Description | File |
|---------|-------------|------|
| **System Architecture** | Full stack overview: Frontend → API Gateway → Backend → Database | [architecture.svg](./architecture.svg) |
| **ER Diagram** | Database schema with PostGIS spatial types and relationships | [er_diagram.svg](./er_diagram.svg) |
| **Data Flow** | DFD showing processes, data stores, and external entities | [data_flow.svg](./data_flow.svg) |
| **Sequence Diagram** | Reconciliation workflow step-by-step | [sequence_diagram.svg](./sequence_diagram.svg) |
| **UML Class Diagram** | Core domain classes and relationships | [uml_class_diagram.svg](./uml_class_diagram.svg) |
| **Component Diagram** | Package structure and dependencies | [component_diagram.svg](./component_diagram.svg) |

## Viewing Diagrams

Open SVG files directly in:
- **Browser**: Chrome, Firefox, Edge
- **VS Code**: SVG Preview extension
- **Design Tools**: Figma, Adobe Illustrator

## Color Legend

| Color | Meaning |
|-------|---------|
| 🔵 Blue | Frontend / User |
| 🟢 Green | Backend / Success |
| 🟠 Orange | Data / Storage |
| 🟣 Purple | Government / External |
| 🔴 Red | Admin / Security |
| 🩷 Pink | Processing / Matching |
| ⚪ Gray | Infrastructure |
