#!/usr/bin/env python
"""
Test runner for Deep Research Agent Interface backend
Provides convenient options for running different test categories
"""

import os
import sys
import subprocess
import argparse

def run_tests(test_path=None, verbose=False, coverage=False):
    """Run pytest with specified options"""
    
    # Base command
    cmd = ["pytest"]
    
    # Add verbosity
    if verbose:
        cmd.append("-v")
    
    # Add coverage if requested
    if coverage:
        cmd.extend(["--cov=.", "--cov-report=term", "--cov-report=html"])
    
    # Add specific test path if provided
    if test_path:
        cmd.append(test_path)
    else:
        cmd.append("tests/")
    
    # Run tests
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    return result.returncode

def main():
    parser = argparse.ArgumentParser(description="Run backend tests for Deep Research Agent Interface")
    
    parser.add_argument("--nodes", action="store_true", help="Run only node function tests")
    parser.add_argument("--workflow", action="store_true", help="Run only workflow tests")
    parser.add_argument("--api", action="store_true", help="Run only API tests")
    parser.add_argument("--utils", action="store_true", help="Run only utility function tests")
    parser.add_argument("--all", action="store_true", help="Run all tests (default)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--coverage", action="store_true", help="Generate coverage report")
    
    args = parser.parse_args()
    
    # Default to all tests if none specified
    if not any([args.nodes, args.workflow, args.api, args.utils, args.all]):
        args.all = True
    
    exit_code = 0
    
    if args.all:
        print("Running all tests...")
        exit_code = run_tests(verbose=args.verbose, coverage=args.coverage)
    else:
        # Run specific test categories
        if args.nodes:
            print("Running node function tests...")
            node_exit = run_tests("tests/test_nodes.py", verbose=args.verbose, coverage=args.coverage)
            exit_code = exit_code or node_exit
            
        if args.workflow:
            print("Running workflow tests...")
            workflow_exit = run_tests("tests/test_workflow.py", verbose=args.verbose, coverage=args.coverage)
            exit_code = exit_code or workflow_exit
            
        if args.api:
            print("Running API tests...")
            api_exit = run_tests("tests/test_api.py", verbose=args.verbose, coverage=args.coverage)
            exit_code = exit_code or api_exit
            
        if args.utils:
            print("Running utility function tests...")
            utils_exit = run_tests("tests/test_utils.py", verbose=args.verbose, coverage=args.coverage)
            exit_code = exit_code or utils_exit
    
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
