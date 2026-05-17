"""
MCP (Model Context Protocol) Tool Interface Layer
Implements structured tool calls that the agent can execute.
Each tool has: name, description, parameters schema, and execute().
"""
from abc import ABC, abstractmethod
from typing import Any
from datetime import datetime



class MCPTool(ABC):
    """Base class for all MCP-compatible tools."""

    name: str = ""
    description: str = ""
    parameters_schema: dict = {}

    @abstractmethod
    async def execute(self, **kwargs) -> dict:
        """Execute the tool and return structured result."""
        ...

    def to_function_spec(self) -> dict:
        """Convert to Gemini function-calling spec."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters_schema,
        }


class MCPToolRegistry:
    """Registry of all available MCP tools."""

    def __init__(self):
        self._tools: dict[str, MCPTool] = {}

    def register(self, tool: MCPTool):
        self._tools[tool.name] = tool
        print(f"[MCP] Tool registered: {tool.name}")

    def get(self, name: str) -> MCPTool | None:
        return self._tools.get(name)

    def list_tools(self) -> list[dict]:
        return [t.to_function_spec() for t in self._tools.values()]

    def all(self) -> list[MCPTool]:
        return list(self._tools.values())


#  Global Registry 
mcp_registry = MCPToolRegistry()
