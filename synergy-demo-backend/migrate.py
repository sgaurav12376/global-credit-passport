import fire
from main import DATABASE_URL
from tortoise import Tortoise, run_async
from tortoise.exceptions import OperationalError

async def init():
    await Tortoise.init(
        config={
            'connections': {
                'default': DATABASE_URL
            },
            'apps': {
                'models': {
                    'models': ['models'],
                    'default_connection': 'default',
                }
            }
        }
    )
    
async def execute_for_connection(sql_file: str, connection: str):
    conn = Tortoise.get_connection(connection_name=connection)
    sql_file = f'sql/{sql_file}'
    print(f'Started Execution for connection: {connection}')
    with open(sql_file, 'r') as f:
        content = f.read()
        commands = content.split(';')
        for command in commands:
            try:
                actual_command = command + ";"
                count, result = await conn.execute_query(actual_command)
                print(f'Executed command with count, result: {count, result}')
            except OperationalError as e:
                print(f'Error in SQL command: {actual_command} => {str(e)}')
    
async def execute(sql_file: str):
    connections = ['default']
    for connection in connections:
        await execute_for_connection(sql_file, connection)
                
    
async def migration(sql: str = 'migration.sql'):
    await execute(sql)
    return ''

if __name__ == '__main__':
    run_async(init())
    fire.Fire(migration)
    #fire.Fire(migration('states.sql'))
